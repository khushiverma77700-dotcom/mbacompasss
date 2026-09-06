// seo-intel-scheduler — the heartbeat of the AI SEO Intelligence Center.
//
// Runs every 5 minutes from pg_cron (and can be poked by an admin).
// Responsibilities, in order:
//   1. recover jobs whose worker lease expired
//   2. bail out when the engine is off / parked / outside its window
//   3. enqueue whatever monitoring work is due (per-type frequency)
//   4. kick the worker once so the queue starts draining
//
// It never does provider work itself, so it always finishes in <2s.

import {
  admin, cors, json, loadIntelSettings, withinSchedule, enqueue, invokeFn,
  logActivity, nowIso,
} from "../_shared/seoIntel.ts";
import { requireAdmin } from "../_shared/requireAdmin.ts";

const MIN = 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const sb = admin();
  const settings = await loadIntelSettings(sb);

  // Auth: cron token (stored per project in settings), CRON_SECRET, or an admin.
  const isCron =
    (body?.cron_token && body.cron_token === settings.cron_token) ||
    (body?.cron_secret && body.cron_secret === Deno.env.get("CRON_SECRET"));
  if (!isCron) {
    const denied = await requireAdmin(req, cors);
    if (denied) return denied;
  }

  // 1. Recover stalled jobs.
  let recovered = 0;
  try {
    const { data } = await sb.rpc("seo_intel_recover_stalled");
    recovered = Number(data ?? 0);
    if (recovered > 0) {
      await logActivity(sb, {
        event: "Recovered stalled jobs",
        detail: `${recovered} job(s) whose worker timed out were returned to the queue`,
        level: "warn", records: recovered,
      });
    }
  } catch (e) {
    console.error("[scheduler] recover failed", (e as Error).message);
  }

  // 2. Gate on the engine switch / schedule.
  const gate = withinSchedule(settings);
  if (!gate.ok && !body?.force) {
    return json({ status: "idle", reason: gate.reason, recovered });
  }

  // 3. Enqueue due work. "Due" = no successful run of that type inside its window.
  const enqueued: string[] = [];
  const plan: Array<{ type: string; everyMin: number; payload?: Record<string, unknown>; priority: number }> = [
    { type: "gsc_pages", everyMin: settings.freq_monitor_min, priority: 1 },
    { type: "gsc_queries", everyMin: settings.freq_monitor_min, priority: 2 },
    { type: "crawl_pages", everyMin: settings.freq_crawl_min, priority: 3 },
    { type: "keyword_metrics", everyMin: settings.freq_rank_min, priority: 4 },
    { type: "rank_track", everyMin: settings.freq_rank_min, priority: 4 },
    // Signal collectors run on a tight cadence with parallel batches; each one
    // self-chains until every page has been measured, so the 64 levers keep
    // gaining coverage across the whole site instead of a few pages per day.
    { type: "index_check", everyMin: Math.min(settings.freq_crawl_min, 30), payload: { batch: 40 }, priority: 5 },
    { type: "live_crawl", everyMin: Math.min(settings.freq_crawl_min, 15), payload: { batch: 12 }, priority: 5 },
    { type: "speed_audit", everyMin: Math.max(settings.freq_crawl_min, 120), payload: { batch: 6, strategy: "mobile" }, priority: 6 },
    { type: "competitor_scan", everyMin: settings.freq_competitor_min, priority: 6 },
    { type: "analyze", everyMin: settings.freq_monitor_min, priority: 7 },
    { type: "verify", everyMin: 1440, priority: 8 },
    // ── advanced intelligence layer: analysis over already-collected signals ──
    { type: "demand_model", everyMin: Math.max(settings.freq_rank_min, 720), payload: { limit: 30 }, priority: 10 },
    { type: "intent_scan", everyMin: 1440, payload: { limit: 150 }, priority: 10 },
    { type: "serp_intel", everyMin: Math.max(settings.freq_competitor_min, 1440), payload: { limit: 6 }, priority: 11 },
    { type: "volatility_scan", everyMin: 720, priority: 11 },
    { type: "forecast", everyMin: 1440, payload: { limit: 80 }, priority: 12 },
    { type: "cannibalization", everyMin: 1440, priority: 12 },
    { type: "ctr_intel", everyMin: 1440, priority: 12 },
    { type: "entity_map", everyMin: 2880, priority: 13 },
    { type: "link_intel", everyMin: 1440, priority: 13 },
    { type: "content_gaps", everyMin: 2880, payload: { limit: 5 }, priority: 14 },
    { type: "anomaly_scan", everyMin: 720, priority: 14 },
    { type: "impact_attribution", everyMin: 1440, priority: 15 },
    { type: "opportunity_score", everyMin: 720, priority: 16 },
    { type: "page_twin", everyMin: 1440, payload: { limit: 25 }, priority: 17 },
    { type: "knowledge_graph", everyMin: 2880, priority: 18 },
    { type: "strategy", everyMin: 10080, priority: 19 },
    { type: "daily_snapshot", everyMin: 720, priority: 19 },
    { type: "report", everyMin: settings.freq_report_min, priority: 20 },
    // ── autonomous research & execution: find keywords, tear competitors down,
    //    and (only in autonomous mode) apply the safe wins by itself ──────────
    { type: "keyword_discovery", everyMin: Math.max(settings.freq_rank_min, 360), priority: 9 },
    // Continuous AI keyword research per page — every page eventually gets its
    // own researched keyword set with the reason each keyword was chosen.
    { type: "keyword_research", everyMin: Math.max(60, Math.min(settings.freq_rank_min, 180)), payload: { batch: 10 }, priority: 9 },
    { type: "competitor_deep", everyMin: Math.max(settings.freq_competitor_min, 720), payload: { batch: 3 }, priority: 11 },
    ...(settings.autonomous_mode
      ? [{ type: "auto_apply", everyMin: 30, payload: { limit: 20 }, priority: 8 }]
      : []),



  ];

  // Only the explicitly requested types when an admin runs a single stage now.
  const only: string[] | null = Array.isArray(body?.only) && body.only.length ? body.only : null;

  for (const step of plan) {
    if (only && !only.includes(step.type)) continue;
    if (!step.everyMin || step.everyMin <= 0) continue;

    if (!body?.force) {
      // Skip when something of this type is already pending.
      const { count: pending } = await sb.from("seo_intel_jobs")
        .select("id", { count: "exact", head: true })
        .eq("job_type", step.type).in("status", ["queued", "running"]);
      if ((pending ?? 0) > 0) continue;

      // Skip when the last successful run is newer than the configured interval.
      const { data: last } = await sb.from("seo_intel_jobs")
        .select("finished_at").eq("job_type", step.type).eq("status", "done")
        .order("finished_at", { ascending: false }).limit(1).maybeSingle();
      if (last?.finished_at && Date.now() - new Date(last.finished_at).getTime() < step.everyMin * MIN) continue;
    }

    const res = await enqueue(sb, {
      job_type: step.type,
      payload: { ...(step.payload ?? {}), cursor: 0 },
      priority: step.priority,
      dedupe_key: `${step.type}:auto`,
      triggered_by: body?.force ? "manual" : "scheduler",
    }).catch((e) => ({ error: (e as Error).message } as any));
    if ((res as any)?.id) enqueued.push(step.type);
  }

  if (enqueued.length) {
    await logActivity(sb, {
      event: "Monitoring cycle queued",
      detail: enqueued.join(", "),
      level: "info", records: enqueued.length,
      meta: { triggered_by: body?.force ? "manual" : "cron", at: nowIso() },
    });
  }

  // 4. Kick the worker (it drains one job then re-kicks itself with a cooldown).
  const { count: queued } = await sb.from("seo_intel_jobs")
    .select("id", { count: "exact", head: true }).eq("status", "queued");
  if ((queued ?? 0) > 0) {
    await invokeFn("seo-intel-worker", {
      cron_token: settings.cron_token,
      depth: 0,
      // Forward the manual flag so a "Run now" click actually drains its jobs
      // even when the engine switch is off or we are outside the window.
      force: body?.force ?? false,
    });
  }

  return json({ status: "ok", recovered, enqueued, queued: queued ?? 0 });
});
