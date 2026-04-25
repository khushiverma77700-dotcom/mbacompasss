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
    // ---- bulk_college_jobs ----
    const { data: stuckColleges, error: e1 } = await admin
      .from("bulk_college_jobs")
      .select("id,status,updated_at,current_activity")
      .in("status", ["pending", "processing"])
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

    // ---- bulk_section_jobs ----
    const { data: stuckSections, error: e2 } = await admin
      .from("bulk_section_jobs")
      .select("id,status,updated_at,current_activity")
      .in("status", ["pending", "processing"])
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
