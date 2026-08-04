// gsc-ingest — Search Console + Analytics signal ingestion.
//
// Stages (each stays well inside the edge CPU budget):
//   pages    → 28-day current + previous window, grouped by page
//   queries  → keyword-level rows (query x page) for the current window
//   health   → merges performance signals into seo_page_health
//
// Every other engine (decay, intent, entity, post-publish pipeline) reads
// the tables this function populates, so real impressions / CTR / position
// drive all scoring.

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import {
  cors, json, dayOffset, gscConfigured, resolveGscSite, gscPageMetrics, gscQueryMetrics,
  loadSettings, SITE_URL,
} from "../_shared/seoSignals.ts";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const isCron = body?.cron_secret && body.cron_secret === Deno.env.get("CRON_SECRET");
  if (!isCron) {
    const denied = await requireAdmin(req, cors);
    if (denied) return denied;
  }

  const sb = admin();
  const stage: string = body.stage ?? "pages";
  let runId: string | null = body.run_id ?? null;

  try {
    if (!gscConfigured()) {
      return json({
        error: "Search Console is not connected. Link the Google Search Console connector first.",
      }, 400);
    }

    const settings = await loadSettings(sb);
    let siteUrl: string | undefined = body.site_url ?? settings.gsc_site_url ?? undefined;
    if (!siteUrl) {
      const resolved = await resolveGscSite(SITE_URL);
      if (resolved.candidates) return json({ status: "selection_required", candidates: resolved.candidates }, 409);
      if (resolved.error || !resolved.siteUrl) return json({ error: resolved.error ?? "No property" }, 400);
      siteUrl = resolved.siteUrl;
    }

    if (stage === "pages") {
      const { data: run } = await sb.from("gsc_ingest_runs")
        .insert({ status: "running", stage: "pages", site_url: siteUrl }).select("id").single();
      runId = run?.id ?? null;

      const current = await gscPageMetrics(siteUrl, dayOffset(30), dayOffset(2));
      const previous = await gscPageMetrics(siteUrl, dayOffset(58), dayOffset(31));

      const rows = [
        ...current.map((r) => ({ ...r, window_label: "current", start_date: dayOffset(30), end_date: dayOffset(2) })),
        ...previous.map((r) => ({ ...r, window_label: "previous", start_date: dayOffset(58), end_date: dayOffset(31) })),
      ].map((r) => ({
        path: r.path,
        window_label: r.window_label,
        start_date: r.start_date,
        end_date: r.end_date,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        avg_position: r.position,
        captured_at: new Date().toISOString(),
      }));

      for (let i = 0; i < rows.length; i += 500) {
        await sb.from("gsc_page_metrics").upsert(rows.slice(i, i + 500), { onConflict: "path,window_label" });
      }

      await sb.from("gsc_ingest_runs").update({
        stage: "pages_done",
        pages_ingested: rows.length,
        notes: [`Ingested ${current.length} current + ${previous.length} previous page rows from ${siteUrl}.`],
      }).eq("id", runId);

      return json({ run_id: runId, site_url: siteUrl, stage: "pages", next_stage: "queries", pages: rows.length });
    }

    if (stage === "queries") {
      const rows = await gscQueryMetrics(siteUrl, dayOffset(30), dayOffset(2));
      const seen = new Set<string>();
      const payload = rows
        .filter((r) => r.query && r.path)
        .filter((r) => {
          const k = `${r.path}::${r.query}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((r) => ({
          path: r.path,
          query: r.query,
          window_label: "current",
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          avg_position: r.position,
          captured_at: new Date().toISOString(),
        }));

      for (let i = 0; i < payload.length; i += 500) {
        await sb.from("gsc_query_metrics").upsert(payload.slice(i, i + 500), { onConflict: "path,query,window_label" });
      }

      if (runId) {
        await sb.from("gsc_ingest_runs").update({ stage: "queries_done", queries_ingested: payload.length }).eq("id", runId);
      }
      return json({ run_id: runId, stage: "queries", next_stage: "health", queries: payload.length });
    }

    if (stage === "health") {
      const { data: metrics } = await sb.from("gsc_page_metrics")
        .select("path, window_label, clicks, impressions, ctr, avg_position");

      const byPath = new Map<string, { cur?: any; prev?: any }>();
      for (const m of metrics ?? []) {
        const e = byPath.get(m.path) ?? {};
        if (m.window_label === "current") e.cur = m;
        if (m.window_label === "previous") e.prev = m;
        byPath.set(m.path, e);
      }

      const { data: health } = await sb.from("seo_page_health").select("id, path");
      const known = new Map((health ?? []).map((h: any) => [h.path, h.id]));

      const updates: any[] = [];
      for (const [path, e] of byPath) {
        if (!known.has(path)) continue;
        const clicks = e.cur?.clicks ?? 0;
        const prevClicks = e.prev?.clicks ?? 0;
        const drop = prevClicks > 0 ? ((prevClicks - clicks) / prevClicks) * 100 : 0;
        const decay_state =
          prevClicks >= 5 && drop >= 60 ? "dying"
          : prevClicks >= 5 && drop >= settings.decay_click_drop_pct ? "decaying"
          : clicks > prevClicks ? "growing"
          : "stable";
        updates.push({
          path,
          clicks,
          impressions: e.cur?.impressions ?? 0,
          ctr: e.cur?.ctr ?? 0,
          avg_position: e.cur?.avg_position ?? null,
          decay_state,
          last_checked_at: new Date().toISOString(),
        });
      }

      for (let i = 0; i < updates.length; i += 300) {
        await sb.from("seo_page_health").upsert(updates.slice(i, i + 300), { onConflict: "path" });
      }

      if (runId) {
        await sb.from("gsc_ingest_runs").update({
          status: "completed", stage: "health_done", finished_at: new Date().toISOString(),
        }).eq("id", runId);
      }
      return json({ run_id: runId, stage: "health", next_stage: null, pages_updated: updates.length });
    }

    return json({ error: `Unknown stage: ${stage}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[gsc-ingest]", msg);
    if (runId) {
      await sb.from("gsc_ingest_runs").update({
        status: "failed", error: msg, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: msg }, 500);
  }
});
