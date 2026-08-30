// seo-intel-control — admin API behind the AI SEO Intelligence Center UI.
//
// Reads are done directly from the tables by the dashboard (admin RLS).
// This function owns everything that mutates state or talks to a provider:
//   snapshot, save_settings, toggle_engine, resume, run_now, test_sources,
//   gsc_sites, rec_action (approve / reject / apply), task_update,
//   console_task_update.

import {
  admin, cors, json, loadIntelSettings, withinSchedule, invokeFn, logActivity,
  logAudit, markSource, nowIso, today, JOB_LABELS,
} from "../_shared/seoIntel.ts";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { gscConfigured, resolveGscSite, GSC_GATEWAY, gscHeaders, SITE_URL } from "../_shared/seoSignals.ts";
import { semrushConfigured, getKeywordMetrics } from "../_shared/keywordMetrics.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";

const firecrawlConfigured = () => !!Deno.env.get("FIRECRAWL_API_KEY");
const openAiConfigured = () => !!(Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEY_2"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const denied = await requireAdmin(req, cors);
  if (denied) return denied;

  const body = await req.json().catch(() => ({} as any));
  const action = String(body?.action ?? "snapshot");
  const sb = admin();

  // Best-effort actor id for the audit trail.
  let actor: string | null = null;
  try {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(jwt.split(".")[1] ?? ""));
    actor = payload?.sub ?? null;
  } catch (_) { /* ignore */ }

  try {
    const settings = await loadIntelSettings(sb);

    switch (action) {
      /* ─────────── snapshot: the whole command centre in one call ─────────── */
      case "snapshot": {
        const [
          sources, queue, running, activity, kpis, recCounts, taskCounts, notifs, lastReport,
        ] = await Promise.all([
          sb.from("seo_intel_sources").select("*").order("label"),
          sb.from("seo_intel_jobs").select("job_type, status, records_processed, error, created_at, finished_at, retry_count")
            .order("created_at", { ascending: false }).limit(40),
          sb.from("seo_intel_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
          sb.from("seo_intel_activity").select("*").order("created_at", { ascending: false }).limit(60),
          sb.from("seo_intel_pages").select("clicks, impressions, avg_position, position_change, health_score, indexed_status, path"),
          sb.from("seo_intel_recommendations").select("status"),
          sb.from("seo_intel_tasks").select("status"),
          sb.from("seo_intel_notifications").select("*").eq("is_read", false).order("created_at", { ascending: false }).limit(20),
          sb.from("seo_intel_reports").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        const pages = kpis.data ?? [];
        const positions = pages.map((p: any) => p.avg_position).filter((v: any) => v != null);
        const gate = withinSchedule(settings);

        return json({
          settings: { ...settings, cron_token: undefined },
          engine: {
            running: gate.ok,
            reason: gate.reason ?? null,
            paused_reason: settings.paused_reason,
            active_jobs: running.count ?? 0,
          },
          sources: sources.data ?? [],
          env: {
            search_console: gscConfigured(),
            semrush: semrushConfigured(),
            firecrawl: firecrawlConfigured(),
            openai: openAiConfigured(),
          },
          queue: queue.data ?? [],
          activity: activity.data ?? [],
          notifications: notifs.data ?? [],
          last_report: lastReport.data ?? null,
          kpis: {
            pages_tracked: pages.length,
            clicks: pages.reduce((s: number, p: any) => s + (p.clicks ?? 0), 0),
            impressions: pages.reduce((s: number, p: any) => s + (p.impressions ?? 0), 0),
            avg_position: positions.length
              ? Number((positions.reduce((a: number, b: number) => a + b, 0) / positions.length).toFixed(2))
              : null,
            improved: pages.filter((p: any) => (p.position_change ?? 0) > 0).length,
            declined: pages.filter((p: any) => (p.position_change ?? 0) < 0).length,
            not_indexed: pages.filter((p: any) => p.indexed_status && !/index/i.test(p.indexed_status)).length,
            avg_health: pages.filter((p: any) => p.health_score != null).length
              ? Number((pages.reduce((s: number, p: any) => s + (p.health_score ?? 0), 0) /
                  pages.filter((p: any) => p.health_score != null).length).toFixed(1))
              : null,
            recommendations_open: (recCounts.data ?? []).filter((r: any) => ["new", "review"].includes(r.status)).length,
            recommendations_applied: (recCounts.data ?? []).filter((r: any) => ["applied", "verified"].includes(r.status)).length,
            tasks_open: (taskCounts.data ?? []).filter((t: any) => !["completed", "rejected"].includes(t.status)).length,
          },
          job_labels: JOB_LABELS,
        });
      }

      /* ─────────── engine controls ─────────── */
      case "toggle_engine": {
        const enabled = !!body.enabled;
        await sb.from("seo_intel_settings").update({
          engine_enabled: enabled,
          paused_reason: enabled ? null : settings.paused_reason,
          updated_by: actor,
        }).eq("id", true);
        await logActivity(sb, {
          event: enabled ? "Engine switched ON" : "Engine switched OFF",
          level: enabled ? "success" : "warn",
        });
        await logAudit(sb, { actor, actor_label: "admin", action: enabled ? "engine_on" : "engine_off", entity: "settings" });
        if (enabled) await invokeFn("seo-intel-scheduler", { cron_token: settings.cron_token });
        return json({ ok: true, engine_enabled: enabled });
      }

      case "resume": {
        await sb.from("seo_intel_settings").update({ paused_reason: null, updated_by: actor }).eq("id", true);
        await logActivity(sb, { event: "Engine resumed by admin", level: "success" });
        await sb.from("seo_intel_jobs").update({ status: "queued", scheduled_for: nowIso(), lease_until: null })
          .eq("status", "parked");
        await invokeFn("seo-intel-scheduler", { cron_token: settings.cron_token });
        return json({ ok: true });
      }

      case "save_settings": {
        const p = body.settings ?? {};
        const allowed = [
          "schedule_mode", "window_start", "window_end", "active_days", "timezone",
          "freq_monitor_min", "freq_rank_min", "freq_competitor_min", "freq_crawl_min", "freq_report_min",
          "auto_apply_safe", "gsc_site_url", "semrush_database", "semrush_campaign_id", "max_pages_per_run",
        ];
        const patch: Record<string, unknown> = { updated_by: actor };
        for (const k of allowed) if (k in p) patch[k] = p[k];
        const { error } = await sb.from("seo_intel_settings").update(patch).eq("id", true);
        if (error) return json({ error: error.message }, 400);
        await logAudit(sb, {
          actor, actor_label: "admin", action: "settings_updated", entity: "settings",
          before_value: settings, after_value: patch,
        });
        await logActivity(sb, { event: "Settings updated", detail: Object.keys(patch).filter((k) => k !== "updated_by").join(", ") });
        return json({ ok: true });
      }

      case "run_now": {
        const only = Array.isArray(body.only) ? body.only : null;
        await invokeFn("seo-intel-scheduler", { cron_token: settings.cron_token, force: true, only });
        await logActivity(sb, {
          event: "Manual run triggered",
          detail: only ? only.map((t: string) => JOB_LABELS[t] ?? t).join(", ") : "full cycle",
        });
        return json({ ok: true });
      }

      case "clear_queue": {
        await sb.from("seo_intel_jobs").update({ status: "cancelled", finished_at: nowIso() })
          .in("status", ["queued", "parked"]);
        await logActivity(sb, { event: "Queue cleared by admin", level: "warn" });
        return json({ ok: true });
      }

      /* ─────────── advanced intelligence layer ─────────── */
      case "intel_snapshot": {
        const locale = settings.semrush_database || "in";
        const [
          demand, intent, serp, volatility, forecasts, cannib, gaps, entities,
          links, ctr, anomalies, opps, profiles, outcomes, graph, strategy, sources,
        ] = await Promise.all([
          sb.from("seo_intel_demand").select("*").eq("locale", locale).order("emerging", { ascending: false }).limit(120),
          sb.from("seo_intel_intent").select("*").eq("locale", locale).order("shift_detected", { ascending: false }).limit(200),
          sb.from("seo_intel_serp").select("*").eq("locale", locale).order("captured_on", { ascending: false }).limit(60),
          sb.from("seo_intel_volatility").select("*").order("detected_on", { ascending: false }).limit(20),
          sb.from("seo_intel_forecasts").select("*").eq("locale", locale).order("probability", { ascending: false, nullsFirst: false }).limit(120),
          sb.from("seo_intel_cannibalization").select("*").eq("status", "open").order("overlap_score", { ascending: false }).limit(60),
          sb.from("seo_intel_content_gaps").select("*").eq("status", "open").order("value_score", { ascending: false, nullsFirst: false }).limit(120),
          sb.from("seo_intel_entities").select("*").order("score", { ascending: false }).limit(200),
          sb.from("seo_intel_link_opportunities").select("*").eq("status", "open").order("score", { ascending: false }).limit(120),
          sb.from("seo_intel_ctr_intel").select("*").order("ctr_delta_pct", { ascending: true }).limit(120),
          sb.from("seo_intel_anomalies").select("*").order("detected_on", { ascending: false }).limit(80),
          sb.from("seo_intel_opportunities").select("*").eq("status", "open").order("priority_rank").limit(150),
          sb.from("seo_intel_page_profiles").select("path, competitive_gap_score, confidence, summary, updated_at").order("competitive_gap_score", { ascending: false, nullsFirst: false }).limit(60),
          sb.from("seo_intel_rec_outcomes").select("*").order("implemented", { ascending: false }),
          sb.from("seo_intel_graph_edges").select("from_type, from_id, edge, to_type, to_id, weight").limit(1500),
          sb.from("seo_intel_strategy").select("*").order("generated_at", { ascending: false }).limit(1).maybeSingle(),
          sb.from("seo_intel_kw_sources").select("keyword, metric, source, value, value_text, label, confidence, observed_at").order("observed_at", { ascending: false }).limit(400),
        ]);
        return json({
          locale,
          demand: demand.data ?? [], intent: intent.data ?? [], serp: serp.data ?? [],
          volatility: volatility.data ?? [], forecasts: forecasts.data ?? [],
          cannibalization: cannib.data ?? [], gaps: gaps.data ?? [], entities: entities.data ?? [],
          links: links.data ?? [], ctr: ctr.data ?? [], anomalies: anomalies.data ?? [],
          opportunities: opps.data ?? [], profiles: profiles.data ?? [],
          learning: outcomes.data ?? [], graph: graph.data ?? [],
          strategy: strategy.data ?? null, keyword_sources: sources.data ?? [],
        });
      }

      case "page_profile": {
        const path = String(body.path ?? "");
        const { data } = await sb.from("seo_intel_page_profiles").select("*").eq("path", path).maybeSingle();
        if (!data) return json({ error: "No profile stored for this page yet. Run the page profile stage first." }, 404);
        return json({ profile: data });
      }

      case "intel_item_action": {
        const table = String(body.table ?? "");
        const allowedTables = ["seo_intel_opportunities", "seo_intel_link_opportunities", "seo_intel_content_gaps", "seo_intel_cannibalization"];
        if (!allowedTables.includes(table)) return json({ error: "Unsupported item type." }, 400);
        const status = String(body.status ?? "");
        if (!["open", "actioned", "dismissed", "done"].includes(status)) return json({ error: "Unsupported status." }, 400);
        const { error } = await sb.from(table).update({ status }).eq("id", String(body.id ?? ""));
        if (error) return json({ error: error.message }, 400);
        await logAudit(sb, { actor, actor_label: "admin", action: `${table}_${status}`, entity: table, entity_id: String(body.id ?? "") });
        return json({ ok: true });
      }

      /* ─────────── live operations feed (polled by the dashboard) ─────────── */
      case "live_status": {
        const since24h = new Date(Date.now() - 864e5).toISOString();
        const [runningJobs, queued, recent, sources, freshness, kwFresh] = await Promise.all([
          sb.from("seo_intel_jobs")
            .select("id, job_type, status, started_at, records_processed, retry_count, payload, lease_until, triggered_by, progress")
            .eq("status", "running").order("started_at"),
          sb.from("seo_intel_jobs")
            .select("id, job_type, status, scheduled_for, priority, triggered_by")
            .in("status", ["queued", "parked"]).order("priority").order("scheduled_for").limit(25),
          sb.from("seo_intel_jobs")
            .select("id, job_type, status, records_processed, error, started_at, finished_at, retry_count, triggered_by, progress")
            .not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(40),
          sb.from("seo_intel_sources").select("source_key, label, kind, configured, status, last_sync_at, next_sync_at, last_error").order("label"),
          sb.from("seo_intel_pages")
            .select("perf_updated_at, last_crawl_at, psi_checked_at, indexed_checked_at, live_crawl_at")
            .order("updated_at", { ascending: false }).limit(500),
          sb.from("seo_intel_keywords").select("last_checked_at").order("last_checked_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
        ]);

        const maxOf = (rows: any[], key: string) => {
          const vals = rows.map((r) => r[key]).filter(Boolean).sort();
          return vals.length ? vals[vals.length - 1] : null;
        };
        const pageRows = freshness.data ?? [];
        const recentRows = recent.data ?? [];

        // Records processed per stage in the last 24 hours — actual worker output.
        const throughput: Record<string, { runs: number; records: number; failed: number; last_finished_at: string | null }> = {};
        for (const j of recentRows) {
          if (!j.finished_at || j.finished_at < since24h) continue;
          const t = (throughput[j.job_type] ??= { runs: 0, records: 0, failed: 0, last_finished_at: null });
          t.runs++;
          t.records += j.records_processed ?? 0;
          if (j.status === "failed") t.failed++;
          if (!t.last_finished_at || j.finished_at > t.last_finished_at) t.last_finished_at = j.finished_at;
        }

        const gate = withinSchedule(settings);
        return json({
          engine: {
            enabled: settings.engine_enabled,
            running: gate.ok,
            reason: gate.reason ?? null,
            paused_reason: settings.paused_reason,
            last_full_scan_at: settings.last_full_scan_at ?? null,
            last_report_at: settings.last_report_at ?? null,
          },
          running: (runningJobs.data ?? []).map((j: any) => ({ ...j, label: JOB_LABELS[j.job_type] ?? j.job_type })),
          queued: (queued.data ?? []).map((j: any) => ({ ...j, label: JOB_LABELS[j.job_type] ?? j.job_type })),
          recent: recentRows.map((j: any) => ({ ...j, label: JOB_LABELS[j.job_type] ?? j.job_type })),
          throughput,
          failures_24h: recentRows.filter((j: any) => j.status === "failed" && j.finished_at >= since24h).length,
          next_scan_at: (queued.data ?? [])[0]?.scheduled_for ?? null,
          sources: sources.data ?? [],
          freshness: {
            performance: maxOf(pageRows, "perf_updated_at"),
            crawl: maxOf(pageRows, "last_crawl_at"),
            speed: maxOf(pageRows, "psi_checked_at"),
            indexing: maxOf(pageRows, "indexed_checked_at"),
            crawler_view: maxOf(pageRows, "live_crawl_at"),
            keywords: kwFresh.data?.last_checked_at ?? null,
          },
          autonomous_mode: !!settings.autonomous_mode,
          server_time: nowIso(),
          job_labels: JOB_LABELS,
        });
      }

      /* ─────────── research feed: what the engine actually learned ─────────── */
      case "research_feed": {
        const sinceIso = new Date(Date.now() - (Number(body?.hours ?? 24) * 36e5)).toISOString();
        const todayStr = new Date().toISOString().slice(0, 10);
        const [activity, newKeywords, gaps, competitors, applied, recs] = await Promise.all([
          sb.from("seo_intel_activity")
            .select("id, event, detail, level, job_type, records, data_source, created_at")
            .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(80),
          sb.from("seo_intel_keywords")
            .select("keyword, search_volume, difficulty, intent, current_position, discovered_from, discovery_source, volume_source, created_at")
            .gte("created_at", sinceIso).order("search_volume", { ascending: false, nullsFirst: false }).limit(40),
          sb.from("seo_intel_content_gaps")
            .select("id, path, keyword, gap_type, title, description, competitor_domain, value_score, priority, status, computed_at")
            .eq("status", "open").order("computed_at", { ascending: false }).limit(40),
          sb.from("seo_intel_competitors")
            .select("domain, keyword, their_url, their_position, our_position, our_path, word_count, faq_count, schema_types, why_outranking, what_to_change, last_checked_at")
            .not("why_outranking", "is", null).order("last_checked_at", { ascending: false, nullsFirst: false }).limit(20),
          sb.from("seo_intel_experiments")
            .select("id, path, keyword, change_type, change_summary, before_value, after_value, baseline_position, changed_on, outcome, measure_after")
            .order("changed_on", { ascending: false }).limit(30),
          sb.from("seo_intel_recommendations")
            .select("id, path, keyword, change_type, recommended_change, priority, confidence, status, auto_appliable, created_at")
            .in("status", ["new", "review", "approved"]).order("created_at", { ascending: false }).limit(30),
        ]);

        const kws = newKeywords.data ?? [];
        return json({
          window_hours: Number(body?.hours ?? 24),
          activity: (activity.data ?? []).map((a: any) => ({ ...a, label: JOB_LABELS[a.job_type] ?? a.job_type ?? null })),
          new_keywords: kws,
          content_gaps: gaps.data ?? [],
          competitor_insights: competitors.data ?? [],
          changes: applied.data ?? [],
          pending_recommendations: recs.data ?? [],
          gains: {
            keywords_discovered: kws.length,
            keywords_discovered_today: kws.filter((k: any) => String(k.created_at ?? "").slice(0, 10) === todayStr).length,
            gaps_open: (gaps.data ?? []).length,
            competitors_analysed: (competitors.data ?? []).length,
            changes_today: (applied.data ?? []).filter((e: any) => e.changed_on === todayStr).length,
            awaiting_approval: (recs.data ?? []).length,
          },
          server_time: nowIso(),
        });
      }

      /* ─────────── impact & change report (recorded history only) ─────────── */
      case "impact_report": {
        const [snapshots, experiments, auditRows, ranks] = await Promise.all([
          sb.from("seo_intel_daily_snapshots").select("*").order("captured_on", { ascending: false }).limit(60),
          sb.from("seo_intel_experiments").select("*").order("changed_on", { ascending: false }).limit(120),
          sb.from("seo_intel_audit")
            .select("id, action, entity, path, before_value, after_value, data_source, created_at, actor_label")
            .order("created_at", { ascending: false }).limit(60),
          sb.from("seo_intel_rank_history")
            .select("keyword, position, captured_on, clicks, impressions, path")
            .gte("captured_on", new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10))
            .order("captured_on", { ascending: false }).limit(4000),
        ]);

        const snaps = snapshots.data ?? [];
        const latest = snaps[0] ?? null;
        // Pick the recorded snapshot closest to N days before the latest one.
        const baselineFor = (days: number) => {
          if (!latest) return null;
          const target = new Date(new Date(latest.captured_on).getTime() - days * 864e5).toISOString().slice(0, 10);
          const older = snaps.filter((s: any) => s.captured_on <= target);
          return older.length ? older[0] : null;
        };
        const METRICS = [
          "clicks", "impressions", "ctr", "avg_position", "ranking_keywords",
          "rank_1", "top_3_calc", "top_5", "top_10", "top_20", "indexed_pages",
          "avg_health", "avg_psi_perf", "avg_lcp_ms",
        ] as const;
        const readMetric = (row: any, m: string) =>
          m === "top_3_calc"
            ? ((row?.rank_1 ?? 0) + (row?.rank_2 ?? 0) + (row?.rank_3 ?? 0)) || null
            : row?.[m] ?? null;

        const windowFor = (days: number) => {
          const base = baselineFor(days);
          const deltas: Record<string, any> = {};
          for (const m of METRICS) {
            const now = readMetric(latest, m);
            const before = readMetric(base, m);
            deltas[m] = {
              current: now,
              previous: before,
              delta: now != null && before != null ? Number((now - before).toFixed(2)) : null,
              // "lower is better" metrics are flagged so the UI never mislabels a win.
              lower_is_better: m === "avg_position" || m === "avg_lcp_ms",
              status: now == null
                ? "no_data"
                : before == null
                ? "awaiting_baseline"
                : now === before
                ? "unchanged"
                : "measured",
            };
          }
          return {
            days,
            baseline_date: base?.captured_on ?? null,
            current_date: latest?.captured_on ?? null,
            comparable: !!(latest && base),
            metrics: deltas,
          };
        };

        // Keyword-level movement straight out of recorded rank history.
        const byKeyword = new Map<string, { keyword: string; points: { d: string; p: number | null }[] }>();
        for (const r of ranks.data ?? []) {
          const e = byKeyword.get(r.keyword) ?? { keyword: r.keyword, points: [] };
          e.points.push({ d: r.captured_on, p: r.position });
          byKeyword.set(r.keyword, e);
        }
        const movement = { improved: [] as any[], declined: [] as any[], unchanged: 0, insufficient_history: 0 };
        for (const e of byKeyword.values()) {
          const pts = e.points.filter((p) => p.p != null).sort((a, b) => (a.d < b.d ? 1 : -1));
          if (pts.length < 2) { movement.insufficient_history++; continue; }
          const now = Number(pts[0].p);
          const then = Number(pts[pts.length - 1].p);
          const delta = Number((then - now).toFixed(2));
          const item = { keyword: e.keyword, from: then, to: now, delta, from_date: pts[pts.length - 1].d, to_date: pts[0].d };
          if (delta > 0.5) movement.improved.push(item);
          else if (delta < -0.5) movement.declined.push(item);
          else movement.unchanged++;
        }
        movement.improved.sort((a, b) => b.delta - a.delta);
        movement.declined.sort((a, b) => a.delta - b.delta);

        const exps = experiments.data ?? [];
        return json({
          has_history: snaps.length > 0,
          snapshot_count: snaps.length,
          latest_snapshot: latest,
          snapshots: snaps.slice().reverse(),
          windows: { today: windowFor(1), d7: windowFor(7), d30: windowFor(30) },
          changes: {
            improved: exps.filter((e: any) => e.outcome === "improved"),
            declined: exps.filter((e: any) => e.outcome === "declined"),
            unchanged: exps.filter((e: any) => e.outcome === "no_change"),
            analyzing: exps.filter((e: any) => !e.outcome || e.outcome === "pending" || !e.result_captured_on),
          },
          movement: { improved: movement.improved.slice(0, 40), declined: movement.declined.slice(0, 40), unchanged: movement.unchanged, insufficient_history: movement.insufficient_history },
          audit: auditRows.data ?? [],
        });
      }

      /* ─────────── approval queue: review → preview → approve → apply → verify ─────────── */
      case "approval_queue": {
        const [recs, tasks, consoleTasks] = await Promise.all([
          sb.from("seo_intel_recommendations")
            .select("*")
            .in("status", ["new", "review", "approved", "applied"])
            .order("priority").order("opportunity_score", { ascending: false, nullsFirst: false }).limit(120),
          sb.from("seo_intel_tasks").select("*").not("status", "in", '("completed","rejected")').order("priority").limit(80),
          sb.from("seo_intel_console_tasks").select("*").neq("status", "completed").order("created_at", { ascending: false }).limit(60),
        ]);
        const list = recs.data ?? [];
        const canAutoApply = (r: any) =>
          !!r.after_value && !!r.path && /title|meta|description/i.test(String(r.change_type ?? ""));
        return json({
          pending: list.filter((r: any) => ["new", "review"].includes(r.status)).map((r: any) => ({ ...r, can_auto_apply: canAutoApply(r) })),
          approved: list.filter((r: any) => r.status === "approved").map((r: any) => ({ ...r, can_auto_apply: canAutoApply(r) })),
          applied: list.filter((r: any) => r.status === "applied"),
          tasks: tasks.data ?? [],
          console_tasks: consoleTasks.data ?? [],
          auto_apply_safe: settings.auto_apply_safe,
        });
      }



      /* ─────────── provider tests (real requests) ─────────── */
      case "test_sources": {
        const results: Record<string, any> = {};

        // Search Console
        if (gscConfigured()) {
          try {
            const res = await fetch(`${GSC_GATEWAY}/webmasters/v3/sites`, { headers: gscHeaders() });
            const txt = await res.text();
            if (res.ok) {
              const sites = (JSON.parse(txt).siteEntry ?? []).filter((s: any) => s.permissionLevel !== "siteUnverifiedUser");
              results.search_console = { ok: true, detail: `${sites.length} verified property(ies)`, properties: sites.map((s: any) => s.siteUrl) };
              await markSource(sb, "search_console", { configured: true, status: "connected", last_tested_at: nowIso(), last_error: null });
              await markSource(sb, "gsc_url_inspection", { configured: true, status: "connected", last_tested_at: nowIso(), last_error: null });
            } else {
              results.search_console = { ok: false, detail: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
              await markSource(sb, "search_console", { configured: true, status: "error", last_tested_at: nowIso(), last_error: `${res.status}: ${txt.slice(0, 300)}` });
            }
          } catch (e) {
            results.search_console = { ok: false, detail: (e as Error).message };
            await markSource(sb, "search_console", { configured: true, status: "error", last_tested_at: nowIso(), last_error: (e as Error).message });
          }
        } else {
          results.search_console = { ok: false, detail: "Not connected. Link the Google Search Console connector to collect actual clicks, impressions and positions." };
          await markSource(sb, "search_console", { configured: false, status: "not_connected", last_tested_at: nowIso(), last_error: "Connector not linked" });
          await markSource(sb, "gsc_url_inspection", { configured: false, status: "not_connected", last_tested_at: nowIso(), last_error: "Connector not linked" });
        }

        // Semrush (via a real keyword lookup)
        if (semrushConfigured()) {
          const { health } = await getKeywordMetrics(["cat exam"], { locale: settings.semrush_database || "in", refresh: true, withGsc: false });
          const ok = health.semrush.ok !== false;
          results.semrush = { ok, detail: ok ? "Live keyword lookup succeeded" : (health.semrush.error ?? "Lookup failed") };
          await markSource(sb, "semrush", { configured: true, status: ok ? "connected" : "error", last_tested_at: nowIso(), last_error: ok ? null : (health.semrush.error ?? "Lookup failed") });
          await markSource(sb, "semrush_tracking", { configured: true, status: settings.semrush_campaign_id ? "connected" : "not_connected", last_tested_at: nowIso(), last_error: settings.semrush_campaign_id ? null : "No Position Tracking campaign configured" });
        } else {
          results.semrush = { ok: false, detail: "Not connected. Search volume and difficulty stay unavailable rather than estimated." };
          await markSource(sb, "semrush", { configured: false, status: "not_connected", last_tested_at: nowIso(), last_error: "Connector not linked" });
        }

        // Firecrawl
        results.firecrawl = firecrawlConfigured()
          ? { ok: true, detail: "Connector key present" }
          : { ok: false, detail: "Not connected — competitor page crawling is unavailable." };
        await markSource(sb, "firecrawl", {
          configured: firecrawlConfigured(),
          status: firecrawlConfigured() ? "connected" : "not_connected",
          last_tested_at: nowIso(),
        });

        // OpenAI (real 1-token completion)
        if (openAiConfigured()) {
          const res = await callAIGateway({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: "Reply with the single word: ok" }],
            max_tokens: 5,
          }, { feature: "seo-intel-source-test" });
          const ok = res.ok;
          const detail = ok ? "Live completion succeeded" : `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
          results.openai = { ok, detail };
          await markSource(sb, "openai", { configured: true, status: ok ? "connected" : "error", last_tested_at: nowIso(), last_error: ok ? null : detail });
        } else {
          results.openai = { ok: false, detail: "No OpenAI key configured (Vaibhav / Suyash)." };
          await markSource(sb, "openai", { configured: false, status: "not_connected", last_tested_at: nowIso(), last_error: "No key" });
        }

        // PageSpeed
        const psKey = Deno.env.get("PAGESPEED_API_KEY");
        results.pagespeed = psKey ? { ok: true, detail: "API key present" } : { ok: false, detail: "No PageSpeed API key — Core Web Vitals unavailable." };
        await markSource(sb, "pagespeed", { configured: !!psKey, status: psKey ? "connected" : "not_connected", last_tested_at: nowIso() });

        await logActivity(sb, { event: "Data sources tested", detail: Object.entries(results).map(([k, v]: any) => `${k}: ${v.ok ? "ok" : "fail"}`).join(", ") });
        return json({ results });
      }

      case "gsc_sites": {
        if (!gscConfigured()) return json({ error: "Search Console connector is not linked." }, 400);
        const r = await resolveGscSite(SITE_URL);
        if (r.candidates) return json({ status: "selection_required", candidates: r.candidates });
        if (r.error) return json({ error: r.error }, 400);
        return json({ status: "selected", site_url: r.siteUrl });
      }

      /* ─────────── recommendations ─────────── */
      case "rec_action": {
        const id = String(body.id ?? "");
        const act = String(body.act ?? "");
        const { data: rec } = await sb.from("seo_intel_recommendations").select("*").eq("id", id).maybeSingle();
        if (!rec) return json({ error: "Recommendation not found" }, 404);

        if (act === "reject") {
          await sb.from("seo_intel_recommendations").update({ status: "rejected", reviewed_by: actor, reviewed_at: nowIso() }).eq("id", id);
          await logAudit(sb, { actor, actor_label: "admin", action: "recommendation_rejected", entity: "recommendation", entity_id: id, path: rec.path, recommendation_id: id });
          return json({ ok: true, status: "rejected" });
        }

        if (act === "approve") {
          await sb.from("seo_intel_recommendations").update({ status: "approved", reviewed_by: actor, reviewed_at: nowIso() }).eq("id", id);
          await sb.from("seo_intel_tasks").insert({
            path: rec.path, keyword: rec.keyword, issue: rec.problem,
            recommendation: rec.recommended_change, recommendation_id: id,
            priority: rec.priority, status: "approved",
            requires_human: !rec.auto_appliable,
            data_source: rec.data_source,
            before_value: rec.before_value, after_value: rec.after_value,
            due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
          });
          await logAudit(sb, { actor, actor_label: "admin", action: "recommendation_approved", entity: "recommendation", entity_id: id, path: rec.path, recommendation_id: id });
          return json({ ok: true, status: "approved" });
        }

        if (act === "apply") {
          if (!rec.path) return json({ error: "This recommendation has no page to apply to." }, 400);
          const changeType = String(rec.change_type ?? "").toLowerCase();
          const isMeta = /title|meta|description/.test(changeType);
          if (!isMeta || !rec.after_value) {
            return json({
              error: "This change needs a human edit — approve it to create a task instead. Only title and meta description changes can be applied automatically.",
            }, 400);
          }
          const slug = rec.path.split("/").filter(Boolean).pop();
          const { data: existing } = await sb.from("page_seo_overrides").select("*").eq("slug", slug).maybeSingle();
          const patch: Record<string, unknown> = { slug, updated_at: nowIso() };
          if (/title/.test(changeType)) patch.title = rec.after_value;
          else patch.description = rec.after_value;

          const { error: upErr } = await sb.from("page_seo_overrides").upsert(patch, { onConflict: "slug" });
          if (upErr) return json({ error: upErr.message }, 400);

          // Baseline for impact measurement.
          const { data: page } = await sb.from("seo_intel_pages")
            .select("avg_position, clicks, impressions").eq("path", rec.path).maybeSingle();
          await sb.from("seo_intel_experiments").insert({
            path: rec.path, keyword: rec.keyword, recommendation_id: id,
            change_type: rec.change_type, change_summary: rec.recommended_change,
            before_value: rec.before_value ?? (/title/.test(changeType) ? existing?.title : existing?.description) ?? null,
            after_value: rec.after_value,
            baseline_position: page?.avg_position ?? null,
            baseline_clicks: page?.clicks ?? null,
            baseline_impressions: page?.impressions ?? null,
            baseline_captured_on: today(),
            changed_on: today(),
            measure_after: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
            data_source: "gsc",
            outcome: "pending",
          });
          await sb.from("seo_intel_recommendations").update({
            status: "applied", applied_at: nowIso(), applied_by: actor,
            reviewed_by: actor, reviewed_at: nowIso(),
          }).eq("id", id);
          await logAudit(sb, {
            actor, actor_label: "admin", action: "recommendation_applied",
            entity: "recommendation", entity_id: id, path: rec.path,
            before_value: { value: existing?.title ?? existing?.description ?? null },
            after_value: { value: rec.after_value },
            data_source: rec.data_source, recommendation_id: id,
          });
          await logActivity(sb, { event: "Change applied", detail: `${rec.path} — ${rec.change_type}`, level: "success" });
          return json({ ok: true, status: "applied" });
        }

        if (act === "verify") {
          // Verification is a measurement, not a claim: it only reads Search Console
          // history for the changed page and records whatever it finds.
          const { data: exp } = await sb.from("seo_intel_experiments")
            .select("id, measure_after, result_captured_on")
            .eq("recommendation_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (!exp) {
            return json({ error: "Nothing to verify yet — this change has not been applied, so there is no before/after record." }, 400);
          }
          await sb.from("seo_intel_jobs").insert({
            job_type: "verify", priority: 3, triggered_by: "admin",
            payload: { experiment_id: exp.id, recommendation_id: id },
            scheduled_for: nowIso(),
          });
          await invokeFn("seo-intel-worker", { cron_token: settings.cron_token, force: true });
          await logActivity(sb, { event: "Verification requested", detail: `${rec.path} — ${rec.change_type}` });
          const waiting = exp.measure_after && new Date(exp.measure_after) > new Date();
          return json({
            ok: true,
            status: "verifying",
            note: waiting
              ? `Queued. Search Console data for this page is still inside the measurement window (until ${exp.measure_after}), so the result may stay "still being analyzed" until then.`
              : "Queued — the worker will compare the recorded before/after Search Console numbers for this page.",
          });
        }

        return json({ error: `Unknown recommendation action: ${act}` }, 400);
      }

      /* ─────────── tasks ─────────── */
      case "task_update": {
        const id = String(body.id ?? "");
        const patch: Record<string, unknown> = {};
        for (const k of ["status", "assignee", "priority", "due_date", "notes", "verification_result"]) {
          if (k in body) patch[k] = body[k];
        }
        const { error } = await sb.from("seo_intel_tasks").update(patch).eq("id", id);
        if (error) return json({ error: error.message }, 400);
        await logAudit(sb, { actor, actor_label: "admin", action: "task_updated", entity: "task", entity_id: id, after_value: patch });
        return json({ ok: true });
      }

      case "console_task_update": {
        const id = String(body.id ?? "");
        const patch: Record<string, unknown> = { status: body.status ?? "submitted" };
        if (body.status === "submitted") { patch.submitted_at = nowIso(); patch.submitted_by = actor; }
        if (body.status === "verified" || body.status === "completed") patch.verified_at = nowIso();
        const { error } = await sb.from("seo_intel_console_tasks").update(patch).eq("id", id);
        if (error) return json({ error: error.message }, 400);
        await logAudit(sb, { actor, actor_label: "admin", action: "console_task_updated", entity: "console_task", entity_id: id, after_value: patch });
        return json({ ok: true });
      }

      case "mark_notifications_read": {
        await sb.from("seo_intel_notifications").update({ is_read: true }).eq("is_read", false);
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[seo-intel-control]", e);
    return json({ error: (e as Error).message ?? String(e) }, 500);
  }
});
