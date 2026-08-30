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
          "auto_apply_safe", "autonomous_mode", "gsc_site_url", "semrush_database", "semrush_campaign_id", "max_pages_per_run",
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

      /* ─────────── coverage pulse: keyword coverage, technical gaps,
         the 64 AI-SEO levers and post-change outcomes — all from stored data ── */
      case "coverage_pulse": {
        const fetchAll = async (table: string, cols: string) => {
          const out: any[] = [];
          for (let from = 0; from < 20000; from += 1000) {
            const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
            if (error) break;
            out.push(...(data ?? []));
            if ((data ?? []).length < 1000) break;
          }
          return out;
        };

        const [pageRows, kwRows, expRows, recRows, snapRows] = await Promise.all([
          fetchAll("seo_intel_pages",
            "path, page_type, title, meta_description, h1, heading_count, word_count, has_schema, schema_types, " +
            "internal_links_out, internal_links_in, indexed_status, indexed_checked_at, health_score, " +
            "clicks, impressions, ctr, avg_position, position_change, perf_updated_at, primary_keyword, target_keywords, " +
            "last_crawl_at, psi_perf_score, psi_seo_score, psi_lcp_ms, psi_cls, psi_tbt_ms, psi_fcp_ms, psi_checked_at, " +
            "rendered_title, rendered_h1, rendered_word_count, rendered_has_schema, rendered_links_out, ssr_gap, live_crawl_at, live_crawl_error"),
          fetchAll("seo_intel_keywords",
            "keyword, target_path, search_volume, volume_source, difficulty, difficulty_source, intent, " +
            "current_position, position_change, opportunity_score, top_competitor_domain, last_checked_at, created_at"),
          sb.from("seo_intel_experiments").select("*").order("changed_on", { ascending: false }).limit(200)
            .then((r: any) => r.data ?? []),
          sb.from("seo_intel_recommendations").select("status, category, change_type, applied_at, created_at")
            .order("created_at", { ascending: false }).limit(1000).then((r: any) => r.data ?? []),
          sb.from("seo_intel_daily_snapshots").select("*").order("captured_on", { ascending: false }).limit(30)
            .then((r: any) => r.data ?? []),
        ]);

        const P = pageRows;
        const K = kwRows;
        const daysAgo = (n: number) => Date.now() - n * 864e5;
        const fresh = (v: any, n: number) => !!v && new Date(v).getTime() > daysAgo(n);
        const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== "";
        const len = (v: any) => String(v ?? "").trim().length;
        const kwIn = (hay: any, needle: any) =>
          has(hay) && has(needle) && String(hay).toLowerCase().includes(String(needle).toLowerCase());
        const schemaHas = (row: any, re: RegExp) =>
          Array.isArray(row.schema_types) && row.schema_types.some((t: any) => re.test(String(t)));

        // A lever is measurable only when the underlying signal was collected for
        // at least one row; otherwise it reports "not measured yet" (never faked).
        type Lever = { id: number; group: string; name: string; ok: (r: any) => boolean; scope?: "page" | "keyword"; gate?: (r: any) => boolean };
        const L: Lever[] = [];
        let n = 0;
        const add = (group: string, name: string, ok: (r: any) => boolean, gate?: (r: any) => boolean, scope: "page" | "keyword" = "page") =>
          L.push({ id: ++n, group, name, ok, gate, scope });

        // 1. Crawlability & indexing
        add("Crawlability & indexing", "Page crawled in last 30 days", (r) => fresh(r.last_crawl_at, 30));
        add("Crawlability & indexing", "Crawler-visibility check done", (r) => has(r.live_crawl_at));
        add("Crawlability & indexing", "No crawler-visibility error", (r) => !has(r.live_crawl_error), (r) => has(r.live_crawl_at));
        add("Crawlability & indexing", "Server-rendered HTML matches app", (r) => r.ssr_gap !== true, (r) => has(r.live_crawl_at));
        add("Crawlability & indexing", "Indexed by Google", (r) => r.indexed_status === "indexed", (r) => has(r.indexed_checked_at));
        add("Crawlability & indexing", "Index status verified", (r) => has(r.indexed_checked_at));
        add("Crawlability & indexing", "Title present in raw HTML", (r) => has(r.rendered_title), (r) => has(r.live_crawl_at));
        add("Crawlability & indexing", "H1 present in raw HTML", (r) => has(r.rendered_h1), (r) => has(r.live_crawl_at));

        // 2. Metadata
        add("Metadata & snippets", "Title tag present", (r) => has(r.title));
        add("Metadata & snippets", "Title length 30–65 chars", (r) => len(r.title) >= 30 && len(r.title) <= 65, (r) => has(r.title));
        add("Metadata & snippets", "Meta description present", (r) => has(r.meta_description));
        add("Metadata & snippets", "Description length 70–165", (r) => len(r.meta_description) >= 70 && len(r.meta_description) <= 165, (r) => has(r.meta_description));
        add("Metadata & snippets", "H1 present", (r) => has(r.h1));
        add("Metadata & snippets", "H1 differs from title", (r) => String(r.h1).trim() !== String(r.title).trim(), (r) => has(r.h1) && has(r.title));
        add("Metadata & snippets", "Primary keyword in title", (r) => kwIn(r.title, r.primary_keyword), (r) => has(r.primary_keyword) && has(r.title));
        add("Metadata & snippets", "Primary keyword in description", (r) => kwIn(r.meta_description, r.primary_keyword), (r) => has(r.primary_keyword) && has(r.meta_description));

        // 3. Content depth
        add("Content depth", "600+ words", (r) => Number(r.word_count) >= 600, (r) => has(r.word_count));
        add("Content depth", "1,200+ words", (r) => Number(r.word_count) >= 1200, (r) => has(r.word_count));
        add("Content depth", "5+ headings", (r) => Number(r.heading_count) >= 5, (r) => has(r.heading_count));
        add("Content depth", "500+ words visible to crawlers", (r) => Number(r.rendered_word_count) >= 500, (r) => has(r.rendered_word_count));
        add("Content depth", "Crawler sees 80%+ of content", (r) => Number(r.rendered_word_count) >= 0.8 * Number(r.word_count || 1), (r) => has(r.rendered_word_count) && has(r.word_count));
        add("Content depth", "Primary keyword assigned", (r) => has(r.primary_keyword));
        add("Content depth", "2+ supporting keywords", (r) => Array.isArray(r.target_keywords) && r.target_keywords.length >= 2);
        add("Content depth", "Primary keyword in H1", (r) => kwIn(r.h1, r.primary_keyword), (r) => has(r.primary_keyword) && has(r.h1));

        // 4. Structured data & answer engines
        add("Structured data & AEO", "Schema markup present", (r) => r.has_schema === true);
        add("Structured data & AEO", "Schema visible to crawlers", (r) => r.rendered_has_schema === true, (r) => has(r.live_crawl_at));
        add("Structured data & AEO", "FAQ schema", (r) => schemaHas(r, /faq/i));
        add("Structured data & AEO", "Article / BlogPosting schema", (r) => schemaHas(r, /article|posting/i));
        add("Structured data & AEO", "Breadcrumb schema", (r) => schemaHas(r, /breadcrumb/i));
        add("Structured data & AEO", "Organisation / LocalBusiness schema", (r) => schemaHas(r, /organi|localbusiness/i));
        add("Structured data & AEO", "Course / Product / Review schema", (r) => schemaHas(r, /course|product|review|aggregaterating/i));
        add("Structured data & AEO", "2+ schema types stacked", (r) => Array.isArray(r.schema_types) && r.schema_types.length >= 2);

        // 5. Internal linking
        add("Internal linking & silos", "3+ outgoing internal links", (r) => Number(r.internal_links_out) >= 3, (r) => has(r.internal_links_out));
        add("Internal linking & silos", "10+ outgoing internal links", (r) => Number(r.internal_links_out) >= 10, (r) => has(r.internal_links_out));
        add("Internal linking & silos", "Receives at least 1 internal link", (r) => Number(r.internal_links_in) >= 1, (r) => has(r.internal_links_in));
        add("Internal linking & silos", "Receives 3+ internal links", (r) => Number(r.internal_links_in) >= 3, (r) => has(r.internal_links_in));
        add("Internal linking & silos", "Links visible in raw HTML", (r) => Number(r.rendered_links_out) >= 3, (r) => has(r.rendered_links_out));
        add("Internal linking & silos", "Not an orphan page", (r) => Number(r.internal_links_in) > 0, (r) => has(r.internal_links_in));
        add("Internal linking & silos", "Balanced in/out linking", (r) => Number(r.internal_links_in) >= 1 && Number(r.internal_links_out) >= 3, (r) => has(r.internal_links_in) && has(r.internal_links_out));
        add("Internal linking & silos", "Hub-level authority (5+ links in)", (r) => Number(r.internal_links_in) >= 5, (r) => has(r.internal_links_in));

        // 6. Speed & Core Web Vitals
        add("Speed & Core Web Vitals", "Speed audited", (r) => has(r.psi_checked_at));
        add("Speed & Core Web Vitals", "Performance score 90+", (r) => Number(r.psi_perf_score) >= 90, (r) => has(r.psi_perf_score));
        add("Speed & Core Web Vitals", "Performance score 50+", (r) => Number(r.psi_perf_score) >= 50, (r) => has(r.psi_perf_score));
        add("Speed & Core Web Vitals", "LCP under 2.5s", (r) => Number(r.psi_lcp_ms) <= 2500, (r) => has(r.psi_lcp_ms));
        add("Speed & Core Web Vitals", "CLS under 0.1", (r) => Number(r.psi_cls) <= 0.1, (r) => has(r.psi_cls));
        add("Speed & Core Web Vitals", "Total blocking time under 200ms", (r) => Number(r.psi_tbt_ms) <= 200, (r) => has(r.psi_tbt_ms));
        add("Speed & Core Web Vitals", "First paint under 1.8s", (r) => Number(r.psi_fcp_ms) <= 1800, (r) => has(r.psi_fcp_ms));
        add("Speed & Core Web Vitals", "Lighthouse SEO score 90+", (r) => Number(r.psi_seo_score) >= 90, (r) => has(r.psi_seo_score));

        // 7. Search performance
        add("Search performance", "Getting impressions", (r) => Number(r.impressions) > 0, (r) => has(r.perf_updated_at));
        add("Search performance", "Getting clicks", (r) => Number(r.clicks) > 0, (r) => has(r.perf_updated_at));
        add("Search performance", "CTR 2% or better", (r) => Number(r.ctr) >= 0.02, (r) => Number(r.impressions) > 0);
        add("Search performance", "Ranking in top 20", (r) => Number(r.avg_position) > 0 && Number(r.avg_position) <= 20, (r) => has(r.avg_position));
        add("Search performance", "Ranking in top 10", (r) => Number(r.avg_position) > 0 && Number(r.avg_position) <= 10, (r) => has(r.avg_position));
        add("Search performance", "Ranking in top 3", (r) => Number(r.avg_position) > 0 && Number(r.avg_position) <= 3, (r) => has(r.avg_position));
        add("Search performance", "Position holding or improving", (r) => Number(r.position_change) >= 0, (r) => has(r.position_change));
        add("Search performance", "Performance data fresh (7 days)", (r) => fresh(r.perf_updated_at, 7));

        // 8. Keyword & competitive intelligence (keyword-scoped)
        add("Keyword intelligence", "Search volume researched", (k) => has(k.search_volume), undefined, "keyword");
        add("Keyword intelligence", "Difficulty researched", (k) => has(k.difficulty), undefined, "keyword");
        add("Keyword intelligence", "Search intent classified", (k) => has(k.intent), undefined, "keyword");
        add("Keyword intelligence", "Mapped to a target page", (k) => has(k.target_path), undefined, "keyword");
        add("Keyword intelligence", "Rank tracked", (k) => has(k.current_position), undefined, "keyword");
        add("Keyword intelligence", "Ranking in top 20", (k) => Number(k.current_position) > 0 && Number(k.current_position) <= 20, (k) => has(k.current_position), "keyword");
        add("Keyword intelligence", "Opportunity scored", (k) => has(k.opportunity_score), undefined, "keyword");
        add("Keyword intelligence", "Competitor identified", (k) => has(k.top_competitor_domain), undefined, "keyword");

        const levers = L.map((lev) => {
          const rows = lev.scope === "keyword" ? K : P;
          const applicable = lev.gate ? rows.filter(lev.gate) : rows;
          const passed = applicable.filter((r) => { try { return lev.ok(r); } catch { return false; } });
          return {
            id: lev.id,
            group: lev.group,
            name: lev.name,
            scope: lev.scope,
            applicable: applicable.length,
            passed: passed.length,
            failed: applicable.length - passed.length,
            coverage: applicable.length ? passed.length / applicable.length : null,
            measured: applicable.length > 0,
          };
        });

        const groups = [...new Set(levers.map((l) => l.group))].map((g) => {
          const items = levers.filter((l) => l.group === g && l.measured);
          const cov = items.length ? items.reduce((s, i) => s + (i.coverage ?? 0), 0) / items.length : null;
          return { group: g, levers: L.filter((l) => l.group === g).length, measured: items.length, coverage: cov };
        });

        const measured = levers.filter((l) => l.measured);
        const overall = measured.length ? measured.reduce((s, i) => s + (i.coverage ?? 0), 0) / measured.length : null;

        // Technical gap queue — biggest real deficits first.
        const gapQueue = levers
          .filter((l) => l.measured && l.failed > 0 && l.scope === "page")
          .sort((a, b) => b.failed - a.failed).slice(0, 20);

        // Post-change outcomes, straight from recorded experiments.
        const outcome = (o: string) => expRows.filter((e: any) => e.outcome === o);
        const withResult = expRows.filter((e: any) => has(e.result_captured_on));
        const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

        return json({
          totals: {
            pages: P.length,
            keywords: K.length,
            pages_with_primary_keyword: P.filter((r) => has(r.primary_keyword)).length,
            pages_with_perf_data: P.filter((r) => has(r.perf_updated_at)).length,
            pages_crawled: P.filter((r) => has(r.last_crawl_at)).length,
            pages_speed_audited: P.filter((r) => has(r.psi_checked_at)).length,
            pages_index_checked: P.filter((r) => has(r.indexed_checked_at)).length,
            keywords_with_volume: K.filter((k) => has(k.search_volume)).length,
            keywords_ranked: K.filter((k) => has(k.current_position)).length,
            keywords_top10: K.filter((k) => Number(k.current_position) > 0 && Number(k.current_position) <= 10).length,
            recommendations_applied: recRows.filter((r: any) => has(r.applied_at)).length,
            recommendations_open: recRows.filter((r: any) => ["new", "review", "approved"].includes(r.status)).length,
          },
          levers,
          groups,
          overall_coverage: overall,
          levers_total: L.length,
          levers_measured: measured.length,
          gap_queue: gapQueue,
          outcomes: {
            changes_tracked: expRows.length,
            measured: withResult.length,
            awaiting_measurement: expRows.length - withResult.length,
            improved: outcome("improved").length,
            declined: outcome("declined").length,
            neutral: outcome("neutral").length,
            avg_position_delta: avg(withResult.map((e: any) => Number(e.position_delta)).filter((v) => Number.isFinite(v))),
            total_clicks_delta: withResult.reduce((s: number, e: any) => s + (Number(e.clicks_delta) || 0), 0),
            recent: expRows.slice(0, 12).map((e: any) => ({
              path: e.path, keyword: e.keyword, change_type: e.change_type, change_summary: e.change_summary,
              changed_on: e.changed_on, outcome: e.outcome,
              position_delta: e.position_delta, clicks_delta: e.clicks_delta,
              baseline_position: e.baseline_position, result_position: e.result_position,
              measure_after: e.measure_after, data_source: e.data_source,
            })),
          },
          trend: snapRows.slice().reverse().map((s: any) => ({
            captured_on: s.captured_on, clicks: s.clicks, impressions: s.impressions,
            avg_position: s.avg_position, top_10: s.top_10, indexed_pages: s.indexed_pages,
            applied_changes: s.applied_changes,
          })),
          server_time: nowIso(),
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
