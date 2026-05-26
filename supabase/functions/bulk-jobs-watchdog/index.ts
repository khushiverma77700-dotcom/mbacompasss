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
const MOCK_MAX_ACTIVE_GENERATIONS = 3;
const MOCK_MAX_ACTIVE_SECTIONS_PER_GENERATION = 3;

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
    mock_worker_pump: null,
    errors: [] as string[],
  };

  try {
    // Keep AI mock batches moving from the server side. This is the laptop-off
    // safety path: pg_cron calls this watchdog, then the watchdog calls the mock
    // worker with the service key so queued mocks can dispatch without a browser.
    try {
      const pumpResp = await fetch(`${SUPABASE_URL}/functions/v1/bulk-mock-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
          "x-internal-pump-key": SERVICE_ROLE,
        },
        body: JSON.stringify({ cron: true, source: "bulk-jobs-watchdog" }),
      });
      (report as any).mock_worker_pump = await pumpResp.json().catch(() => ({ status: pumpResp.status }));
    } catch (err) {
      (report.errors as string[]).push(`mock worker pump: ${(err as Error).message}`);
    }

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

    // Auto-fail any mock_section_jobs idle for >30 minutes — abandoned jobs
    // (rate-limited / worker crashed) otherwise sit forever wasting AI credits.
    try {
      const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: autoFailed, error: failErr } = await admin
        .from("mock_section_jobs")
        .update({
          status: "failed",
          current_step: "Auto-failed by watchdog — idle for more than 30 minutes.",
          final_reason: "auto_failed_stale",
          updated_at: new Date().toISOString(),
        })
        .in("status", ["pending", "processing"])
        .lt("updated_at", staleCutoff)
        .select("id");
      (report as any).mock_section_jobs_auto_failed = (autoFailed || []).map((r: any) => r.id);
      if (failErr) (report.errors as string[]).push(`mock auto-fail: ${failErr.message}`);
    } catch (err) {
      (report.errors as string[]).push(`mock auto-fail: ${(err as Error).message}`);
    }

    // Also close out parent generations that are 'running' but have no live work.
    try {
      const { data: staleGens } = await admin
        .from("ai_mock_generations")
        .select("id")
        .eq("status", "running")
        .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
      for (const g of (staleGens || []) as any[]) {
        const { count: liveCount } = await admin
          .from("mock_section_jobs")
          .select("id", { count: "exact", head: true })
          .eq("generation_id", g.id)
          .in("status", ["pending", "processing"])
          .gt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
        if ((liveCount || 0) === 0) {
          await admin
            .from("ai_mock_generations")
            .update({
              status: "failed",
              error_message: "Auto-failed: no active section jobs remaining.",
              finished_at: new Date().toISOString(),
            })
            .eq("id", g.id);
        }
      }
    } catch (err) {
      (report.errors as string[]).push(`gen auto-fail: ${(err as Error).message}`);
    }

    const { data: activeMockGenerations } = await admin
      .from("bulk_mock_request_items")
      .select("generation_id,started_at,created_at")
      .eq("paused", false)
      .eq("status", "processing")
      .not("generation_id", "is", null)
      .order("started_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(MOCK_MAX_ACTIVE_GENERATIONS);
    const activeGenerationIds = new Set((activeMockGenerations || []).map((g: any) => String(g.generation_id)));

    const { data: pendingMockJobs, error: e3 } = await admin
      .from("mock_section_jobs")
      .select("id,generation_id,status,updated_at,worker_lock_until,error_message,current_step")
      .eq("status", "pending")
      .in("generation_id", Array.from(activeGenerationIds).length ? Array.from(activeGenerationIds) : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: true });

    if (e3) (report.errors as string[]).push(`mock fetch: ${e3.message}`);

    const kickedMockJobs: string[] = [];
    const kickedPerGeneration = new Map<string, number>();
    for (const job of (pendingMockJobs || [])) {
      try {
        const errText = String((job as any).error_message || "").toLowerCase();
        if (errText.includes("exceeded your current quota") || errText.includes("quota/rate-limit blocked") || errText.includes("billing")) continue;
        const generationId = String((job as any).generation_id || (job as any).id);
        if (!activeGenerationIds.has(generationId)) continue;
        if ((kickedPerGeneration.get(generationId) || 0) >= MOCK_MAX_ACTIVE_SECTIONS_PER_GENERATION) continue;
        const { count: activeCount } = await admin
          .from("mock_section_jobs")
          .select("id", { count: "exact", head: true })
          .eq("generation_id", (job as any).generation_id)
          .eq("status", "processing")
          .gt("worker_lock_until", new Date().toISOString());
        if ((activeCount || 0) >= MOCK_MAX_ACTIVE_SECTIONS_PER_GENERATION) continue;
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
