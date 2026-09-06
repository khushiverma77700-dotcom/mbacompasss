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
import { gscConfigured, resolveGscSite, GSC_GATEWAY, gscHeaders, SITE_URL, gscDailyMetrics } from "../_shared/seoSignals.ts";
import { semrushConfigured, getKeywordMetrics } from "../_shared/keywordMetrics.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { applyRecommendation, canAutoApply, classifyChange } from "../_shared/seoApply.ts";


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

      /* ─────────── performance_report: live top-level SEO performance
         report built from actual Search Console daily rows ─────────── */
      case "performance_report": {
        const force = !!body?.force;
        let sync: { ran: boolean; days: number; error: string | null; site: string | null } = {
          ran: false, days: 0, error: null, site: null,
        };

        // Refresh the daily history when it is stale (or on demand).
        const { data: freshest } = await sb.from("seo_gsc_daily")
          .select("captured_on, synced_at").order("captured_on", { ascending: false }).limit(1).maybeSingle();
        const staleMs = Date.now() - new Date(freshest?.synced_at ?? 0).getTime();
        const shouldSync = gscConfigured() && (force || !freshest || staleMs > 3 * 36e5);

        if (shouldSync) {
          try {
            const resolved = await resolveGscSite();
            const siteUrl = settings.gsc_site_url ?? resolved.siteUrl ?? null;
            if (!siteUrl) throw new Error(resolved.error ?? "Search Console property is not selected yet.");
            sync.site = siteUrl;
            // Full history: Search Console retains ~16 months.
            const start = new Date(Date.now() - 490 * 864e5).toISOString().slice(0, 10);
            const end = new Date(Date.now() - 1 * 864e5).toISOString().slice(0, 10);
            const rows = await gscDailyMetrics(siteUrl, start, end);
            if (rows.length) {
              for (let i = 0; i < rows.length; i += 500) {
                const chunk = rows.slice(i, i + 500).map((r) => ({
                  captured_on: r.date,
                  clicks: r.clicks,
                  impressions: r.impressions,
                  ctr: r.ctr,
                  avg_position: r.position,
                  synced_at: nowIso(),
                }));
                await sb.from("seo_gsc_daily").upsert(chunk, { onConflict: "captured_on" });
              }
            }
            sync = { ran: true, days: rows.length, error: null, site: siteUrl };
            await markSource(sb, "gsc", { status: "connected", last_sync_at: nowIso(), last_error: null });
            await logActivity(sb, {
              event: "Search Console daily history refreshed",
              detail: `${rows.length} day(s) of actual performance data stored`,
              level: "success", data_source: "gsc", records: rows.length,
            });
          } catch (e) {
            sync = { ran: false, days: 0, error: (e as Error).message, site: sync.site };
            await logActivity(sb, {
              event: "Search Console daily refresh failed",
              detail: (e as Error).message, level: "error", data_source: "gsc",
            });
          }
        }

        // Read the whole stored history back (paged).
        const daily: any[] = [];
        for (let from = 0; from < 20000; from += 1000) {
          const { data, error } = await sb.from("seo_gsc_daily")
            .select("captured_on, clicks, impressions, ctr, avg_position")
            .order("captured_on", { ascending: true }).range(from, from + 999);
          if (error) break;
          daily.push(...(data ?? []));
          if ((data ?? []).length < 1000) break;
        }

        const avg = (vals: number[]) =>
          vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4)) : null;
        const sum = (vals: number[]) => vals.reduce((a, b) => a + b, 0);
        const clicksArr = daily.map((d) => Number(d.clicks ?? 0));
        const imprArr = daily.map((d) => Number(d.impressions ?? 0));
        const ctrArr = daily.filter((d) => d.ctr != null).map((d) => Number(d.ctr));
        const posArr = daily.filter((d) => d.avg_position != null).map((d) => Number(d.avg_position));

        const overall = {
          from: daily[0]?.captured_on ?? null,
          to: daily[daily.length - 1]?.captured_on ?? null,
          days: daily.length,
          total_clicks: sum(clicksArr),
          total_impressions: sum(imprArr),
          avg_daily_clicks: avg(clicksArr),
          avg_daily_impressions: avg(imprArr),
          avg_ctr: avg(ctrArr),
          avg_position: avg(posArr),
        };

        const latest = daily[daily.length - 1] ?? null;
        const cmp = (now: any, base: any, lowerIsBetter = false) => {
          if (now == null || base == null || base === 0) {
            return { value: now ?? null, baseline: base ?? null, delta: null, pct: null, direction: "no_data" as string };
          }
          const delta = Number((Number(now) - Number(base)).toFixed(4));
          const pctChange = Number(((delta / Math.abs(Number(base))) * 100).toFixed(2));
          const better = lowerIsBetter ? delta < 0 : delta > 0;
          return {
            value: Number(now), baseline: Number(base), delta, pct: pctChange,
            direction: delta === 0 ? "flat" : better ? "up" : "down",
          };
        };

        const windowAvg = (n: number, key: string) => {
          const slice = daily.slice(-n).filter((d) => d[key] != null).map((d) => Number(d[key]));
          return avg(slice);
        };

        const todayVsOverall = {
          date: latest?.captured_on ?? null,
          clicks: cmp(latest?.clicks ?? null, overall.avg_daily_clicks),
          impressions: cmp(latest?.impressions ?? null, overall.avg_daily_impressions),
          ctr: cmp(latest?.ctr ?? null, overall.avg_ctr),
          avg_position: cmp(latest?.avg_position ?? null, overall.avg_position, true),
        };

        const recent = {
          last_7_clicks: windowAvg(7, "clicks"),
          last_28_clicks: windowAvg(28, "clicks"),
          last_7_ctr: windowAvg(7, "ctr"),
          last_28_ctr: windowAvg(28, "ctr"),
          last_7_position: windowAvg(7, "avg_position"),
          last_28_position: windowAvg(28, "avg_position"),
          last_7_impressions: windowAvg(7, "impressions"),
          last_28_impressions: windowAvg(28, "impressions"),
        };

        // Cumulative + growth-% series. Growth is measured against the first
        // 7 recorded days (the earliest stable baseline we actually have).
        const baseWindow = daily.slice(0, Math.min(7, daily.length));
        const baseline = {
          clicks: avg(baseWindow.map((d) => Number(d.clicks ?? 0))),
          impressions: avg(baseWindow.map((d) => Number(d.impressions ?? 0))),
          ctr: avg(baseWindow.filter((d) => d.ctr != null).map((d) => Number(d.ctr))),
          avg_position: avg(baseWindow.filter((d) => d.avg_position != null).map((d) => Number(d.avg_position))),
        };
        let cumClicks = 0;
        let cumImpr = 0;
        const series = daily.map((d, i) => {
          cumClicks += Number(d.clicks ?? 0);
          cumImpr += Number(d.impressions ?? 0);
          const roll = (key: string, n = 7) => {
            const slice = daily.slice(Math.max(0, i - n + 1), i + 1)
              .filter((x) => x[key] != null).map((x) => Number(x[key]));
            return avg(slice);
          };
          const growth = (val: any, base: any, lowerIsBetter = false) => {
            if (val == null || base == null || !base) return null;
            const g = ((Number(val) - Number(base)) / Math.abs(Number(base))) * 100;
            return Number((lowerIsBetter ? -g : g).toFixed(2));
          };
          const r7Clicks = roll("clicks");
          const r7Ctr = roll("ctr");
          const r7Pos = roll("avg_position");
          const r7Impr = roll("impressions");
          return {
            date: d.captured_on,
            clicks: Number(d.clicks ?? 0),
            impressions: Number(d.impressions ?? 0),
            ctr: d.ctr == null ? null : Number((Number(d.ctr) * 100).toFixed(2)),
            avg_position: d.avg_position == null ? null : Number(Number(d.avg_position).toFixed(2)),
            clicks_7d: r7Clicks,
            impressions_7d: r7Impr,
            ctr_7d: r7Ctr == null ? null : Number((r7Ctr * 100).toFixed(2)),
            position_7d: r7Pos,
            cum_clicks: cumClicks,
            cum_impressions: cumImpr,
            growth_clicks_pct: growth(r7Clicks, baseline.clicks),
            growth_impressions_pct: growth(r7Impr, baseline.impressions),
            growth_ctr_pct: growth(r7Ctr, baseline.ctr),
            growth_position_pct: growth(r7Pos, baseline.avg_position, true),
          };
        });

        return json({
          data_source: "gsc",
          data_label: daily.length ? "actual" : "unavailable",
          configured: gscConfigured(),
          sync,
          overall,
          baseline,
          latest_day: latest,
          today_vs_overall: todayVsOverall,
          recent,
          series,
          server_time: nowIso(),
        });
      }

      /* ─────────── wins board: every real improvement, nothing invented ─────────── */
      case "wins_report": {
        // 1. Site-level windows straight out of the stored Search Console history.
        const dailyRows: any[] = [];
        for (let from = 0; from < 20000; from += 1000) {
          const { data, error } = await sb.from("seo_gsc_daily")
            .select("captured_on, clicks, impressions, ctr, avg_position")
            .order("captured_on", { ascending: true }).range(from, from + 999);
          if (error) break;
          dailyRows.push(...(data ?? []));
          if ((data ?? []).length < 1000) break;
        }
        const mean = (v: number[]) => (v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(4)) : null);
        const win = (label: string, cur: number | null, prev: number | null, unit: string, lowerIsBetter = false) => {
          if (cur == null || prev == null || !prev) return null;
          const delta = Number((cur - prev).toFixed(4));
          const pct = Number(((delta / Math.abs(prev)) * 100).toFixed(2));
          const improved = lowerIsBetter ? delta < 0 : delta > 0;
          return { label, current: cur, previous: prev, delta, pct, unit, improved, lower_is_better: lowerIsBetter };
        };
        const windowStats = (n: number, offset = 0) => {
          const end = dailyRows.length - offset;
          const slice = dailyRows.slice(Math.max(0, end - n), Math.max(0, end));
          return {
            days: slice.length,
            clicks: mean(slice.map((d) => Number(d.clicks ?? 0))),
            impressions: mean(slice.map((d) => Number(d.impressions ?? 0))),
            ctr: mean(slice.filter((d) => d.ctr != null).map((d) => Number(d.ctr))),
            avg_position: mean(slice.filter((d) => d.avg_position != null).map((d) => Number(d.avg_position))),
            total_clicks: slice.reduce((a, b) => a + Number(b.clicks ?? 0), 0),
            total_impressions: slice.reduce((a, b) => a + Number(b.impressions ?? 0), 0),
          };
        };
        const last7 = windowStats(7);
        const prev7 = windowStats(7, 7);
        const last28 = windowStats(28);
        const prev28 = windowStats(28, 28);
        const allTime = {
          days: dailyRows.length,
          clicks: mean(dailyRows.map((d) => Number(d.clicks ?? 0))),
          impressions: mean(dailyRows.map((d) => Number(d.impressions ?? 0))),
          ctr: mean(dailyRows.filter((d) => d.ctr != null).map((d) => Number(d.ctr))),
          avg_position: mean(dailyRows.filter((d) => d.avg_position != null).map((d) => Number(d.avg_position))),
        };

        const siteWins = [
          win("Daily clicks (7d vs previous 7d)", last7.clicks, prev7.clicks, "clicks"),
          win("CTR (7d vs previous 7d)", last7.ctr, prev7.ctr, "ratio"),
          win("Average ranking (7d vs previous 7d)", last7.avg_position, prev7.avg_position, "position", true),
          win("Impressions (7d vs previous 7d)", last7.impressions, prev7.impressions, "impressions"),
          win("Daily clicks (28d vs previous 28d)", last28.clicks, prev28.clicks, "clicks"),
          win("CTR (28d vs previous 28d)", last28.ctr, prev28.ctr, "ratio"),
          win("Average ranking (28d vs previous 28d)", last28.avg_position, prev28.avg_position, "position", true),
          win("Clicks vs all-time daily average", last7.clicks, allTime.clicks, "clicks"),
          win("CTR vs all-time average", last7.ctr, allTime.ctr, "ratio"),
          win("Ranking vs all-time average", last7.avg_position, allTime.avg_position, "position", true),
        ].filter(Boolean);

        // 2. Page-level wins (stored current vs previous window per page).
        const pageRows: any[] = [];
        for (let from = 0; from < 12000; from += 1000) {
          const { data, error } = await sb.from("seo_intel_pages")
            .select("path, title, clicks, prev_clicks, impressions, prev_impressions, ctr, avg_position, prev_avg_position, position_change, perf_updated_at, indexed_status")
            .range(from, from + 999);
          if (error) break;
          pageRows.push(...(data ?? []));
          if ((data ?? []).length < 1000) break;
        }
        const ratio = (num: number | null, den: number | null) =>
          num == null || den == null || !den ? null : Number((Number(num) / Number(den)).toFixed(4));
        const pageWins = pageRows.map((p) => {
          const prevCtr = ratio(p.prev_clicks, p.prev_impressions);
          const curCtr = p.ctr != null ? Number(p.ctr) : ratio(p.clicks, p.impressions);
          const clickDelta = p.prev_clicks == null ? null : Number(p.clicks ?? 0) - Number(p.prev_clicks ?? 0);
          const posDelta = p.prev_avg_position == null || p.avg_position == null
            ? (p.position_change == null ? null : Number(p.position_change))
            : Number((Number(p.prev_avg_position) - Number(p.avg_position)).toFixed(2));
          const ctrDelta = prevCtr == null || curCtr == null ? null : Number((curCtr - prevCtr).toFixed(4));
          const ctrPct = prevCtr && ctrDelta != null ? Number(((ctrDelta / prevCtr) * 100).toFixed(2)) : null;
          const score =
            (clickDelta && clickDelta > 0 ? clickDelta * 3 : 0) +
            (posDelta && posDelta > 0 ? posDelta * 4 : 0) +
            (ctrPct && ctrPct > 0 ? Math.min(ctrPct, 200) * 0.5 : 0);
          const kinds: string[] = [];
          if (clickDelta != null && clickDelta > 0) kinds.push("clicks");
          if (posDelta != null && posDelta > 0) kinds.push("ranking");
          if (ctrPct != null && ctrPct > 0) kinds.push("ctr");
          return {
            path: p.path, title: p.title ?? null,
            clicks: Number(p.clicks ?? 0), prev_clicks: p.prev_clicks == null ? null : Number(p.prev_clicks),
            impressions: Number(p.impressions ?? 0),
            ctr: curCtr, prev_ctr: prevCtr, ctr_delta: ctrDelta, ctr_pct: ctrPct,
            avg_position: p.avg_position == null ? null : Number(p.avg_position),
            prev_avg_position: p.prev_avg_position == null ? null : Number(p.prev_avg_position),
            position_gain: posDelta, click_delta: clickDelta,
            indexed_status: p.indexed_status ?? null,
            updated_at: p.perf_updated_at ?? null,
            kinds, score: Number(score.toFixed(2)),
          };
        }).filter((p) => p.kinds.length > 0).sort((a, b) => b.score - a.score).slice(0, 60);

        // 3. Keyword wins (ranking improvements + new page-1 entries).
        const kwRows: any[] = [];
        for (let from = 0; from < 12000; from += 1000) {
          const { data, error } = await sb.from("seo_intel_keywords")
            .select("keyword, locale, target_path, current_position, previous_position, position_change, best_position, clicks, impressions, ctr, search_volume, intent, last_checked_at")
            .range(from, from + 999);
          if (error) break;
          kwRows.push(...(data ?? []));
          if ((data ?? []).length < 1000) break;
        }
        const keywordWins = kwRows.map((k) => {
          const cur = k.current_position == null ? null : Number(k.current_position);
          const prev = k.previous_position == null ? null : Number(k.previous_position);
          const gain = prev != null && cur != null ? Number((prev - cur).toFixed(2))
            : (k.position_change == null ? null : Number(k.position_change));
          const enteredTop10 = cur != null && cur <= 10 && prev != null && prev > 10;
          const enteredTop3 = cur != null && cur <= 3 && prev != null && prev > 3;
          const score = (gain && gain > 0 ? gain * 5 : 0)
            + (enteredTop10 ? 40 : 0) + (enteredTop3 ? 60 : 0)
            + Math.min(Number(k.search_volume ?? 0) / 100, 40);
          return {
            keyword: k.keyword, locale: k.locale, target_path: k.target_path ?? null,
            current_position: cur, previous_position: prev, position_gain: gain,
            best_position: k.best_position == null ? null : Number(k.best_position),
            clicks: Number(k.clicks ?? 0), impressions: Number(k.impressions ?? 0),
            ctr: k.ctr == null ? null : Number(k.ctr),
            search_volume: k.search_volume == null ? null : Number(k.search_volume),
            intent: k.intent ?? null, checked_at: k.last_checked_at ?? null,
            entered_top10: enteredTop10, entered_top3: enteredTop3,
            score: Number(score.toFixed(2)),
          };
        }).filter((k) => (k.position_gain != null && k.position_gain > 0) || k.entered_top10 || k.entered_top3)
          .sort((a, b) => b.score - a.score).slice(0, 60);

        // 4. Applied-change wins recorded by the engine.
        const { data: outcomes } = await sb.from("seo_intel_rec_outcomes")
          .select("category, change_type, implemented, succeeded, failed, inconclusive, avg_position_delta, avg_ctr_delta, avg_days_to_impact, updated_at")
          .order("implemented", { ascending: false, nullsFirst: false }).limit(200);
        const changeWins = (outcomes ?? []).filter((o: any) => {
          const pos = o?.avg_position_delta == null ? null : Number(o.avg_position_delta);
          const ctr = o?.avg_ctr_delta == null ? null : Number(o.avg_ctr_delta);
          return Number(o?.succeeded ?? 0) > 0 || (pos != null && pos < 0) || (ctr != null && ctr > 0);
        }).map((o: any) => ({
          category: o.category, change_type: o.change_type,
          implemented: Number(o.implemented ?? 0), succeeded: Number(o.succeeded ?? 0),
          failed: Number(o.failed ?? 0), inconclusive: Number(o.inconclusive ?? 0),
          avg_position_delta: o.avg_position_delta == null ? null : Number(o.avg_position_delta),
          avg_ctr_delta: o.avg_ctr_delta == null ? null : Number(o.avg_ctr_delta),
          avg_days_to_impact: o.avg_days_to_impact == null ? null : Number(o.avg_days_to_impact),
          updated_at: o.updated_at ?? null,
        })).slice(0, 40);

        const totals = {
          site_wins: siteWins.filter((w: any) => w.improved).length,
          site_checks: siteWins.length,
          page_wins: pageWins.length,
          pages_tracked: pageRows.length,
          keyword_wins: keywordWins.length,
          keywords_tracked: kwRows.length,
          change_wins: changeWins.length,
          clicks_gained: pageWins.reduce((a, p) => a + Math.max(0, Number(p.click_delta ?? 0)), 0),
          positions_gained: Number(keywordWins.reduce((a, k) => a + Math.max(0, Number(k.position_gain ?? 0)), 0).toFixed(1)),
          top10_entries: keywordWins.filter((k) => k.entered_top10).length,
          top3_entries: keywordWins.filter((k) => k.entered_top3).length,
        };

        // Compact comparison series for the animated versus-charts.
        const compare = [
          { metric: "Clicks / day", current: last7.clicks, previous: prev7.clicks, all_time: allTime.clicks, lower_is_better: false },
          { metric: "Impressions / day", current: last7.impressions, previous: prev7.impressions, all_time: allTime.impressions, lower_is_better: false },
          { metric: "CTR %", current: last7.ctr == null ? null : Number((last7.ctr * 100).toFixed(2)), previous: prev7.ctr == null ? null : Number((prev7.ctr * 100).toFixed(2)), all_time: allTime.ctr == null ? null : Number((allTime.ctr * 100).toFixed(2)), lower_is_better: false },
          { metric: "Avg position", current: last7.avg_position, previous: prev7.avg_position, all_time: allTime.avg_position, lower_is_better: true },
        ];

        return json({
          data_source: "gsc+engine",
          data_label: dailyRows.length ? "actual" : "unavailable",
          configured: gscConfigured(),
          windows: { last7, prev7, last28, prev28, all_time: allTime },
          compare,
          site_wins: siteWins,
          page_wins: pageWins,
          keyword_wins: keywordWins,
          change_wins: changeWins,
          totals,
          server_time: nowIso(),
        });
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
        // Paged: the queue must handle 100 or 10,000 recommendations, so the UI
        // asks for a window instead of a hard-capped list.
        const limit = Math.max(20, Math.min(1000, Number(body.limit ?? 300)));
        const offset = Math.max(0, Number(body.offset ?? 0));
        const wantStates: string[] = Array.isArray(body.states) && body.states.length
          ? body.states.map(String)
          : ["new", "review", "approved"];

        let q = sb.from("seo_intel_recommendations")
          .select("*", { count: "exact" })
          .in("status", wantStates);
        if (body.category) q = q.eq("category", String(body.category));
        if (body.priority) q = q.eq("priority", String(body.priority));
        if (body.path_like) q = q.ilike("path", `%${String(body.path_like)}%`);

        const [recs, tasks, consoleTasks, counts] = await Promise.all([
          q.order("priority").order("opportunity_score", { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1),
          sb.from("seo_intel_tasks").select("*").not("status", "in", '("completed","rejected")').order("priority").limit(80),
          sb.from("seo_intel_console_tasks").select("*").neq("status", "completed").order("created_at", { ascending: false }).limit(60),
          Promise.all(["new", "review", "approved", "applied", "rejected"].map(async (s) => {
            const { count } = await sb.from("seo_intel_recommendations")
              .select("id", { count: "exact", head: true }).eq("status", s);
            return [s, count ?? 0] as const;
          })),
        ]);
        const list = recs.data ?? [];
        const withFlag = (r: any) => ({ ...r, can_auto_apply: canAutoApply(r), apply_kind: classifyChange(r) });
        return json({
          pending: list.filter((r: any) => ["new", "review"].includes(r.status)).map(withFlag),
          approved: list.filter((r: any) => r.status === "approved").map(withFlag),
          applied: list.filter((r: any) => r.status === "applied").map(withFlag),
          total_matching: recs.count ?? list.length,
          offset, limit,
          status_counts: Object.fromEntries(counts),
          tasks: tasks.data ?? [],
          console_tasks: consoleTasks.data ?? [],
          auto_apply_safe: settings.auto_apply_safe,
        });
      }

      /* ─────────── bulk approve / apply / reject ─────────── */
      case "bulk_rec_action": {
        const act = String(body.act ?? "approve");
        if (!["approve", "reject", "apply"].includes(act)) return json({ error: `Unsupported bulk action: ${act}` }, 400);

        const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
        const max = Math.max(1, Math.min(2000, Number(body.max ?? 500)));

        let rows: any[] = [];
        if (ids.length) {
          const { data } = await sb.from("seo_intel_recommendations").select("*").in("id", ids.slice(0, max));
          rows = data ?? [];
        } else {
          // "Approve all" / "Apply all" for the current filter, in priority order.
          let q = sb.from("seo_intel_recommendations").select("*")
            .in("status", Array.isArray(body.states) && body.states.length ? body.states.map(String) : ["new", "review"]);
          if (body.category) q = q.eq("category", String(body.category));
          if (body.priority) q = q.eq("priority", String(body.priority));
          if (body.path_like) q = q.ilike("path", `%${String(body.path_like)}%`);
          if (body.only_auto) q = q.not("path", "is", null);
          const { data } = await q.order("priority").order("opportunity_score", { ascending: false, nullsFirst: false }).limit(max);
          rows = data ?? [];
        }

        if (act === "reject" || act === "approve") {
          const targetIds = rows.map((r) => r.id);
          if (!targetIds.length) return json({ ok: true, processed: 0, note: "Nothing matched." });
          await sb.from("seo_intel_recommendations")
            .update({ status: act === "approve" ? "approved" : "rejected", reviewed_by: actor, reviewed_at: nowIso() })
            .in("id", targetIds);
          if (act === "approve") {
            const tasks = rows.map((rec: any) => ({
              path: rec.path, keyword: rec.keyword, issue: rec.problem,
              recommendation: rec.recommended_change, recommendation_id: rec.id,
              priority: rec.priority, status: "approved",
              requires_human: !canAutoApply(rec),
              data_source: rec.data_source,
              before_value: rec.before_value, after_value: rec.after_value,
              due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
            }));
            for (let i = 0; i < tasks.length; i += 200) {
              await sb.from("seo_intel_tasks").insert(tasks.slice(i, i + 200));
            }
            // Auto-appliable approvals are handed to the engine so approval
            // actually results in a change on the site.
            if (body.then_apply !== false) {
              await sb.from("seo_intel_jobs").insert({
                job_type: "auto_apply", priority: 2, triggered_by: "admin",
                payload: { limit: Math.min(50, targetIds.length), ids: rows.filter(canAutoApply).map((r) => r.id).slice(0, 200) },
                scheduled_for: nowIso(),
              });
              await invokeFn("seo-intel-worker", { cron_token: settings.cron_token, force: true });
            }
          }
          await logActivity(sb, {
            event: act === "approve" ? "Bulk approval" : "Bulk rejection",
            detail: `${targetIds.length} recommendation(s)`, level: "info", records: targetIds.length,
          });
          return json({ ok: true, processed: targetIds.length, act });
        }

        // Bulk apply: real writes, done inside the request for a small window and
        // handed to the worker for the rest so nothing times out.
        const eligible = rows.filter(canAutoApply);
        const inline = eligible.slice(0, Math.max(1, Math.min(12, Number(body.inline ?? 8))));
        const deferred = eligible.slice(inline.length);
        let ok = 0; const failures: string[] = [];
        for (const rec of inline) {
          const outcome = await applyRecommendation(sb, rec, { actor, actorLabel: "admin (bulk)" });
          if (outcome.ok) ok++;
          else if (failures.length < 5) failures.push(`${rec.path}: ${outcome.reason}`);
        }
        if (deferred.length) {
          await sb.from("seo_intel_jobs").insert({
            job_type: "auto_apply", priority: 2, triggered_by: "admin",
            payload: { limit: deferred.length, ids: deferred.map((r) => r.id) },
            scheduled_for: nowIso(),
          });
          await invokeFn("seo-intel-worker", { cron_token: settings.cron_token, force: true });
        }
        return json({
          ok: true, act: "apply", applied_now: ok, queued: deferred.length,
          skipped: rows.length - eligible.length, failures,
        });
      }

      /* ─────────── website SEO health meter ─────────── */
      case "health_meter": {
        // Paginated so the average covers every page, not just the first 1000.
        const rows: any[] = [];
        for (let from = 0; from < 20000; from += 1000) {
          const { data: chunk, error: pageErr } = await sb.from("seo_intel_pages")
            .select("path, page_type, health_score, aeo_score, health_issues")
            .order("path", { ascending: true })
            .range(from, from + 999);
          if (pageErr) throw new Error(`pages read failed: ${pageErr.message}`);
          if (!chunk?.length) break;
          rows.push(...chunk);
          if (chunk.length < 1000) break;
        }

        const scored = rows.filter((p: any) => p.health_score !== null && p.health_score !== undefined);
        const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
        const avgHealth = avg(scored.map((p: any) => Number(p.health_score)));
        const aeoRows = rows.filter((p: any) => p.aeo_score !== null && p.aeo_score !== undefined);
        const avgAeo = avg(aeoRows.map((p: any) => Number(p.aeo_score)));
        const issuesOpen = rows.reduce((n: number, p: any) => n + (Array.isArray(p.health_issues) ? p.health_issues.length : 0), 0);

        const countOf = async (status: string) => {
          const { count } = await sb.from("seo_intel_recommendations")
            .select("id", { count: "exact", head: true }).eq("status", status);
          return count ?? 0;
        };
        const [appliedTotal, pendingNew, pendingReview, approved, rejected] = await Promise.all([
          countOf("applied"), countOf("new"), countOf("review"), countOf("approved"), countOf("rejected"),
        ]);
        const { count: applied24h } = await sb.from("seo_intel_recommendations")
          .select("id", { count: "exact", head: true }).eq("status", "applied")
          .gte("applied_at", new Date(Date.now() - 864e5).toISOString());

        // Per-page-type breakdown so a score change is always explainable.
        const byType: Record<string, { pages: number; avg_health: number | null; avg_aeo: number | null }> = {};
        for (const p of rows) {
          const k = String(p.page_type ?? "other");
          byType[k] ??= { pages: 0, avg_health: null, avg_aeo: null };
          byType[k].pages++;
        }
        for (const k of Object.keys(byType)) {
          const set = rows.filter((p: any) => String(p.page_type ?? "other") === k);
          byType[k].avg_health = avg(set.filter((p: any) => p.health_score != null).map((p: any) => Number(p.health_score)));
          byType[k].avg_aeo = avg(set.filter((p: any) => p.aeo_score != null).map((p: any) => Number(p.aeo_score)));
        }

        const { data: history } = await sb.from("seo_intel_health_history")
          .select("*").order("captured_at", { ascending: false }).limit(60);
        const prev = (history ?? [])[0];
        const delta = avgHealth != null && prev?.avg_health != null ? Number(avgHealth) - Number(prev.avg_health) : null;

        // Measured per-page impact of applied fixes.
        const { data: measured } = await sb.from("seo_intel_page_scores")
          .select("health_before, health_after, aeo_before, aeo_after, issues_before, issues_after, status")
          .eq("status", "measured").limit(1000);
        const gains = (measured ?? []).filter((m: any) => m.health_after != null && m.health_before != null);
        const avgGain = avg(gains.map((m: any) => Number(m.health_after) - Number(m.health_before)));

        const snapshot = {
          avg_health: avgHealth == null ? null : Number(avgHealth.toFixed(1)),
          avg_aeo: avgAeo == null ? null : Number(avgAeo.toFixed(1)),
          pages_scored: scored.length,
          pages_total: rows.length,
          pages_below_70: scored.filter((p: any) => Number(p.health_score) < 70).length,
          issues_open: issuesOpen,
          applied_total: appliedTotal,
          pending_total: pendingNew + pendingReview + approved,
          pending_new: pendingNew, pending_review: pendingReview, pending_approved: approved,
          rejected_total: rejected,
          applied_24h: applied24h ?? 0,
          delta_health: delta == null ? null : Number(delta.toFixed(2)),
          measured_fixes: gains.length,
          avg_score_gain_per_fix: avgGain == null ? null : Number(avgGain.toFixed(2)),
          by_page_type: byType,
        };

        if (body.capture) {
          await sb.from("seo_intel_health_history").insert({
            avg_health: snapshot.avg_health, avg_aeo: snapshot.avg_aeo,
            pages_scored: snapshot.pages_scored, pages_below_70: snapshot.pages_below_70,
            issues_open: snapshot.issues_open, applied_total: snapshot.applied_total,
            pending_total: snapshot.pending_total, applied_24h: snapshot.applied_24h,
            delta_health: snapshot.delta_health,
            reason: `${snapshot.applied_24h} fix(es) applied in the last 24h across ${snapshot.pages_scored} scored pages`,
            breakdown: byType,
          });
        }

        return json({ ok: true, snapshot, history: (history ?? []).reverse() });
      }

      /* ─────────── keyword research feed ─────────── */
      case "keyword_research": {
        if (body.run) {
          await sb.from("seo_intel_jobs").insert({
            job_type: "keyword_research", priority: 3, triggered_by: "admin",
            payload: { batch: Math.max(1, Math.min(40, Number(body.batch ?? 8))), path: body.path ?? null },
            scheduled_for: nowIso(),
          });
          await invokeFn("seo-intel-worker", { cron_token: settings.cron_token, force: true });
          await logActivity(sb, { event: "Keyword research requested", detail: body.path ? String(body.path) : "next pages in rotation" });
          return json({ ok: true, queued: true });
        }
        const limit = Math.max(20, Math.min(1000, Number(body.limit ?? 300)));
        let kq = sb.from("seo_intel_keywords").select("*", { count: "exact" }).not("researched_at", "is", null);
        if (body.path) kq = kq.eq("research_source_path", String(body.path));
        if (body.kind) kq = kq.eq("keyword_kind", String(body.kind));
        const { data: kws, count } = await kq.order("researched_at", { ascending: false }).limit(limit);
        const { data: pages } = await sb.from("seo_intel_pages")
          .select("path, entity_name, page_type, primary_keyword, target_keywords")
          .not("primary_keyword", "is", null).limit(300);
        return json({ ok: true, keywords: kws ?? [], total: count ?? 0, pages: pages ?? [] });
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
          const outcome = await applyRecommendation(sb, rec, { actor, actorLabel: "admin" });
          if (!outcome.ok) {
            if (outcome.needs_human) {
              return json({ error: `${outcome.reason} Approve it to create a task for a human.` }, 400);
            }
            return json({ error: outcome.reason }, 400);
          }
          return json({ ok: true, status: "applied", fields: outcome.fields, detail: outcome.detail });
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
