// Bulk Jobs Watchdog
// Runs on a schedule (pg_cron every ~2 min) and resumes any bulk job that is
// stuck in pending/processing for too long. Acts as the safety net so that
// content generation continues fully autonomously even if a worker invocation
// drops, the user closes their laptop, or the network blips.
//
// Supports both:
//   - bulk_college_jobs   -> bulk-college-create (action: resume)
//   - bulk_section_jobs   -> bulk-section-create (action: resume)
//
// Public endpoint (no auth) — invoked by pg_cron via pg_net.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// A job is considered stuck if it has not been updated for this many minutes.
const STUCK_MINUTES = 3;

interface JobLike {
  id: string;
  status: string;
  updated_at: string;
  current_activity?: string | null;
}

async function resumeJob(fnName: string, jobId: string) {
  return fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      "x-worker-key": SERVICE_ROLE,
    },
    body: JSON.stringify({ action: "resume", job_id: jobId }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60 * 1000).toISOString();

  const report: Record<string, unknown> = {
    checked_at: new Date().toISOString(),
    stuck_minutes_threshold: STUCK_MINUTES,
    college_jobs_resumed: [] as string[],
    section_jobs_resumed: [] as string[],
    errors: [] as string[],
  };

  try {
    const { data: recovered, error: recoverError } = await admin.rpc("recover_stale_bulk_jobs", {
      _threshold_minutes: STUCK_MINUTES,
    });
    report.database_recovery = recovered || null;
    if (recoverError) (report.errors as string[]).push(`database recovery: ${recoverError.message}`);

    // ---- bulk_college_jobs ---- (skip paused jobs)
    const { data: stuckColleges, error: e1 } = await admin
      .from("bulk_college_jobs")
      .select("id,status,updated_at,current_activity,paused")
      .in("status", ["pending", "running", "processing"])
      .eq("paused", false)
      .lt("updated_at", cutoff);

    if (e1) (report.errors as string[]).push(`college fetch: ${e1.message}`);

    for (const job of (stuckColleges || []) as JobLike[]) {
      try {
        await admin
          .from("bulk_college_jobs")
          .update({
            current_activity: `Watchdog resumed (was idle since ${job.updated_at})`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        await resumeJob("bulk-college-create", job.id);
        (report.college_jobs_resumed as string[]).push(job.id);
      } catch (err) {
        (report.errors as string[]).push(`college ${job.id}: ${(err as Error).message}`);
      }
    }

    // ---- bulk_section_jobs ---- (skip paused jobs)
    const { data: stuckSections, error: e2 } = await admin
      .from("bulk_section_jobs")
      .select("id,status,updated_at,current_activity,paused")
      .in("status", ["pending", "running", "processing"])
      .eq("paused", false)
      .lt("updated_at", cutoff);

    if (e2) (report.errors as string[]).push(`section fetch: ${e2.message}`);

    for (const job of (stuckSections || []) as JobLike[]) {
      try {
        // Also reset any per-step "processing" rows older than cutoff to "pending"
        // by leaning on the existing auto_retry_stale action of the worker.
        await fetch(`${SUPABASE_URL}/functions/v1/bulk-section-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
            "x-worker-key": SERVICE_ROLE,
          },
          body: JSON.stringify({ action: "auto_retry_stale", job_id: job.id }),
        }).catch(() => {});

        await admin
          .from("bulk_section_jobs")
          .update({
            current_activity: `Watchdog resumed (was idle since ${job.updated_at})`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        await resumeJob("bulk-section-create", job.id);
        (report.section_jobs_resumed as string[]).push(job.id);
      } catch (err) {
        (report.errors as string[]).push(`section ${job.id}: ${(err as Error).message}`);
      }
    }

    // ---- mock_section_jobs (AI mock generator) ----
    // Two responsibilities here:
    //  (1) recover any 'processing' job whose worker_lock_until expired
    //  (2) kick off any 'pending' job that has no active worker
    // We always use the service role token so the worker is never blocked
    // by a stale end-user JWT.
    try {
      const { data: recoveredCount, error: recErr } = await admin.rpc(
        "recover_stale_mock_section_jobs",
        { _threshold_minutes: STUCK_MINUTES },
      );
      (report as any).mock_section_jobs_recovered = recoveredCount ?? 0;
      if (recErr) (report.errors as string[]).push(`mock recovery: ${recErr.message}`);
    } catch (err) {
      (report.errors as string[]).push(`mock recovery: ${(err as Error).message}`);
    }

    const { data: pendingMockJobs, error: e3 } = await admin
      .from("mock_section_jobs")
      .select("id,generation_id,status,updated_at,worker_lock_until,error_message,current_step")
      .eq("status", "pending")
      .not("error_message", "ilike", "%exceeded your current quota%")
      .not("error_message", "ilike", "%quota/rate-limit blocked%")
      .not("error_message", "ilike", "%billing%")
      .order("created_at", { ascending: true });

    if (e3) (report.errors as string[]).push(`mock fetch: ${e3.message}`);

    const kickedMockJobs: string[] = [];
    const kickedPerGeneration = new Map<string, number>();
    for (const job of (pendingMockJobs || [])) {
      try {
        const generationId = String((job as any).generation_id || (job as any).id);
        if ((kickedPerGeneration.get(generationId) || 0) >= 3) continue;
        const { count: activeCount } = await admin
          .from("mock_section_jobs")
          .select("id", { count: "exact", head: true })
          .eq("generation_id", (job as any).generation_id)
          .eq("status", "processing")
          .gt("worker_lock_until", new Date().toISOString());
        if ((activeCount || 0) >= 3) continue;
        await admin
          .from("mock_section_jobs")
          .update({
            status: "processing",
            current_step: "Watchdog kicked off worker…",
            worker_lock_until: new Date(Date.now() + 8 * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", (job as any).id);

        await fetch(`${SUPABASE_URL}/functions/v1/retry-mock-section`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
            apikey: SERVICE_ROLE,
          },
          body: JSON.stringify({ job_id: (job as any).id, auto: true, service: true }),
        }).catch(() => {});

        kickedMockJobs.push((job as any).id);
        kickedPerGeneration.set(generationId, (kickedPerGeneration.get(generationId) || 0) + 1);
      } catch (err) {
        (report.errors as string[]).push(`mock kickoff ${(job as any).id}: ${(err as Error).message}`);
      }
    }
    (report as any).mock_section_jobs_kicked = kickedMockJobs;

    console.log("Watchdog run", JSON.stringify(report));
    return new Response(JSON.stringify({ ok: true, ...report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("Watchdog error", msg);
    return new Response(JSON.stringify({ ok: false, error: msg, ...report }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
