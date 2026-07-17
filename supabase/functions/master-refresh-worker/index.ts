// Master Refresh Worker — server-side background processor.
// Called by cron every minute AND kicked immediately after a job is queued.
// Claims pending items from master_refresh_items, invokes refresh-content
// with the job's configured model, and rolls up progress on the job row.
// Runs entirely on the backend — no browser needs to stay open.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// How long to keep processing in one invocation. Edge functions have ~150s.
const MAX_RUN_MS = 110_000;
// Per-item lock (mins) — long enough for one refresh-content call.
const LOCK_MINUTES = 8;

async function processOne(sb: any): Promise<{ done: boolean; job_id?: string }> {
  const { data: item, error } = await sb.rpc("claim_master_refresh_item", { _lock_minutes: LOCK_MINUTES });
  if (error) throw error;
  const claimed = Array.isArray(item) ? item[0] : item;
  if (!claimed || !claimed.id) return { done: true };

  const { data: job } = await sb.from("master_refresh_jobs").select("id, mode, model, paused, status").eq("id", claimed.job_id).maybeSingle();
  if (!job || job.paused || ["cancelled","paused"].includes(job.status)) {
    await sb.from("master_refresh_items").update({ status: "pending", worker_lock_until: null }).eq("id", claimed.id);
    return { done: true };
  }

  // Mark job running
  if (job.status === "queued") {
    await sb.from("master_refresh_jobs").update({ status: "running", started_at: new Date().toISOString(), last_activity: `Processing ${claimed.entity_name}` }).eq("id", job.id);
  } else {
    await sb.from("master_refresh_jobs").update({ last_activity: `Processing ${claimed.entity_name}` }).eq("id", job.id);
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/refresh-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        entity_type: claimed.entity_type,
        entity_id: claimed.entity_id,
        mode: job.mode,
        model: job.model,
        requested_by: null,
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`refresh-content ${resp.status}: ${t.slice(0, 300)}`);
    }
    const data = await resp.json().catch(() => ({}));
    await sb.from("master_refresh_items").update({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      changed_fields: data?.changed_fields ?? null,
      total_fields: data?.total_fields ?? null,
      error: null,
    }).eq("id", claimed.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("master_refresh_items").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error: msg.slice(0, 500),
    }).eq("id", claimed.id);
  }

  return { done: false, job_id: job.id };
}

async function rollupJob(sb: any, jobId: string) {
  const { data: rows } = await sb.from("master_refresh_items").select("status").eq("job_id", jobId);
  if (!rows) return;
  const succeeded = rows.filter((r: any) => r.status === "succeeded").length;
  const failed = rows.filter((r: any) => r.status === "failed").length;
  const pending = rows.filter((r: any) => r.status === "pending" || r.status === "processing").length;
  const inProgress = rows.filter((r: any) => r.status === "processing").length;
  const total = rows.length;
  const patch: any = { total, succeeded, failed, in_progress: inProgress };
  if (pending === 0) { patch.status = "completed"; patch.finished_at = new Date().toISOString(); patch.last_activity = `Completed — ${succeeded} succeeded, ${failed} failed`; }
  await sb.from("master_refresh_jobs").update(patch).eq("id", jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const started = Date.now();
  let processed = 0;
  const touchedJobs = new Set<string>();

  try {
    // Watchdog: unlock stuck items whose lock expired
    await sb.from("master_refresh_items")
      .update({ status: "pending", worker_lock_until: null })
      .lt("worker_lock_until", new Date().toISOString())
      .eq("status", "processing");

    while (Date.now() - started < MAX_RUN_MS) {
      const res = await processOne(sb);
      if (res.done) break;
      processed++;
      if (res.job_id) touchedJobs.add(res.job_id);
      // Rollup periodically
      if (processed % 3 === 0) {
        for (const jid of touchedJobs) await rollupJob(sb, jid);
      }
    }
    for (const jid of touchedJobs) await rollupJob(sb, jid);

    // Auto-fail items that have exceeded the retry budget so they stop being requeued forever.
    await sb.from("master_refresh_items")
      .update({ status: "failed", worker_lock_until: null, finished_at: new Date().toISOString(), error: "exceeded max attempts (5)" })
      .in("status", ["pending", "processing"])
      .gte("attempts", 5);

    // Only re-kick if we actually made progress AND there are claimable items left.
    // "Claimable" = pending items belonging to a queued/running, un-paused job.
    // This prevents the runaway self-kick loop that used to fire on any orphaned pending row.
    if (processed > 0) {
      const { count: claimable } = await sb.from("master_refresh_items")
        .select("id, master_refresh_jobs!inner(status,paused)", { count: "exact", head: true })
        .eq("status", "pending")
        .in("master_refresh_jobs.status", ["queued", "running"])
        .eq("master_refresh_jobs.paused", false);
      if ((claimable ?? 0) > 0) {
        const kick = fetch(`${SUPABASE_URL}/functions/v1/master-refresh-worker`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ self_kick: true }),
        }).catch(() => {});
        // @ts-ignore EdgeRuntime is a Supabase Deno global
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(kick);
      }
    }
    const remaining = 0;

    return new Response(JSON.stringify({ processed, remaining: remaining ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e), processed }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
