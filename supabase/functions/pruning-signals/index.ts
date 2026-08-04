// Content Pruning — Phase 1b: enrich the inventory with off-page signals.
//
// POST /pruning-signals { run_id }
// Admin only. Pulls Search Console performance (clicks, impressions, CTR,
// position for the last 28 days plus the previous 28 for trend), index state
// from page_indexing_status, and speed from seo_health_page_results, then
// recomputes every score.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { computeScores } from "../_shared/pruning.ts";

const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const gscHeaders = () => ({
  Authorization: `Bearer ${LOVABLE_API_KEY}`,
  "X-Connection-Api-Key": GSC_KEY,
  "Content-Type": "application/json",
});

const dayOffset = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

interface Metrics { clicks: number; impressions: number; ctr: number; position: number | null }

/** Resolve the verified GSC property that covers the site, if any. */
async function resolveSite(target: string): Promise<{ siteUrl?: string; candidates?: string[]; error?: string }> {
  const res = await fetch(`${GSC_GATEWAY}/webmasters/v3/sites`, { headers: gscHeaders() });
  const text = await res.text();
  if (!res.ok) return { error: `gsc_sites_failed [${res.status}]: ${text}` };
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { return { error: "gsc_sites_invalid_json" }; }
  const entries: any[] = parsed.siteEntry ?? [];
  const url = new URL(target);
  const covers = (siteUrl: string) => {
    if (siteUrl.startsWith("sc-domain:")) {
      const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
      const host = url.hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    }
    try { return url.href.startsWith(new URL(siteUrl).href); } catch { return false; }
  };
  const matches = entries
    .filter((e) => e.permissionLevel !== "siteUnverifiedUser" && covers(e.siteUrl))
    .map((e) => e.siteUrl);
  if (!matches.length) return { error: "no_verified_property" };
  if (matches.length === 1) return { siteUrl: matches[0] };
  return { candidates: matches };
}

async function fetchPageMetrics(siteUrl: string, startDate: string, endDate: string) {
  const out = new Map<string, Metrics>();
  const rowLimit = 25000;
  for (let startRow = 0; ; startRow += rowLimit) {
    const res = await fetch(
      `${GSC_GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: gscHeaders(),
        body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit, startRow, type: "web" }),
      },
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`gsc_query_failed [${res.status}]: ${text}`);
    const rows: any[] = JSON.parse(text).rows ?? [];
    for (const r of rows) {
      const page = (r.keys?.[0] ?? "").replace(/\/$/, "");
      if (!page) continue;
      out.set(page, {
        clicks: Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
        ctr: Number(((r.ctr ?? 0) * 100).toFixed(2)),
        position: r.position != null ? Number(r.position.toFixed(1)) : null,
      });
    }
    if (rows.length < rowLimit) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({} as any));
  const runId: string | null = body?.run_id ?? null;
  const notes: string[] = [];

  try {
    const { data: pages, error } = await client
      .from("pruning_pages")
      .select("id, url, path, page_type, word_count, heading_count, faq_count, has_schema, meta_title, meta_description, h1, days_since_update, stale_facts, internal_links_in, internal_links_out, backlinks, signals");
    if (error) throw new Error(`pages_load_failed: ${error.message}`);
    if (!pages?.length) return json({ ok: true, updated: 0, note: "inventory is empty — run the scan first" });

    /* ------------------------------ GSC metrics ------------------------------ */
    let current = new Map<string, Metrics>();
    let previous = new Map<string, Metrics>();
    let gscOk = false;
    if (!LOVABLE_API_KEY || !GSC_KEY) {
      notes.push("Search Console connector not configured — traffic signals unavailable.");
    } else {
      const site = body?.site_url
        ? { siteUrl: body.site_url as string }
        : await resolveSite("https://mbacompass.in/");
      if (site.candidates) {
        return json({ status: "selection_required", candidates: site.candidates }, 409);
      }
      if (site.error || !site.siteUrl) {
        notes.push(`Search Console unavailable: ${site.error ?? "unknown"}`);
      } else {
        try {
          current = await fetchPageMetrics(site.siteUrl, dayOffset(30), dayOffset(2));
          previous = await fetchPageMetrics(site.siteUrl, dayOffset(58), dayOffset(31));
          gscOk = true;
          notes.push(`Search Console: ${current.size} URLs with data (${site.siteUrl}).`);
        } catch (e) {
          notes.push(`Search Console query failed: ${(e as Error).message}`);
        }
      }
    }

    /* --------------------------- index + speed data --------------------------- */
    const [{ data: idxRows }, { data: healthRows }] = await Promise.all([
      client.from("page_indexing_status").select("url, index_status, google_canonical, user_canonical, coverage_state"),
      client.from("seo_health_page_results").select("url, speed_score, robots_meta, canonical_url, checked_at").order("checked_at", { ascending: false }).limit(4000),
    ]);
    const idxByUrl = new Map<string, any>();
    for (const r of idxRows ?? []) if (r.url) idxByUrl.set(r.url.replace(/\/$/, ""), r);
    const healthByUrl = new Map<string, any>();
    for (const r of healthRows ?? []) {
      const key = (r.url ?? "").replace(/\/$/, "");
      if (key && !healthByUrl.has(key)) healthByUrl.set(key, r);
    }

    /* --------------------------------- merge --------------------------------- */
    let updated = 0;
    const updates = pages.map((p: any) => {
      const key = p.url.replace(/\/$/, "");
      const m = current.get(key) ?? { clicks: 0, impressions: 0, ctr: 0, position: null };
      const prev = previous.get(key) ?? { clicks: 0, impressions: 0, ctr: 0, position: null };
      const idx = idxByUrl.get(key);
      const health = healthByUrl.get(key);
      const scores = computeScores({
        word_count: p.word_count ?? 0,
        heading_count: p.heading_count ?? 0,
        faq_count: p.faq_count ?? 0,
        has_schema: !!p.has_schema,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
        h1: p.h1,
        days_since_update: p.days_since_update,
        stale_facts: p.stale_facts ?? [],
        internal_links_in: p.internal_links_in ?? 0,
        internal_links_out: p.internal_links_out ?? 0,
        backlinks: p.backlinks ?? 0,
        clicks: m.clicks,
        impressions: m.impressions,
        avg_position: m.position,
        index_state: idx?.index_status ?? null,
        psi_score: health?.speed_score ?? null,
      });
      return {
        id: p.id,
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.ctr,
        avg_position: m.position,
        clicks_prev: prev.clicks,
        impressions_prev: prev.impressions,
        sessions: m.clicks,
        index_state: idx?.index_status ?? null,
        canonical_url: idx?.user_canonical ?? health?.canonical_url ?? null,
        robots: health?.robots_meta ?? null,
        psi_score: health?.speed_score ?? null,
        signals: {
          ...(p.signals ?? {}),
          gsc_available: gscOk,
          coverage_state: idx?.coverage_state ?? null,
          google_canonical: idx?.google_canonical ?? null,
        },
        signals_at: new Date().toISOString(),
        ...scores,
      };
    });

    for (let i = 0; i < updates.length; i += 200) {
      const chunk = updates.slice(i, i + 200);
      const { error: upErr } = await client.from("pruning_pages").upsert(chunk, { onConflict: "id" });
      if (upErr) console.error("[pruning-signals] upsert:", upErr.message);
      else updated += chunk.length;
    }

    if (runId) {
      await client.from("pruning_runs").update({
        phase: "analysis",
        signals_count: updated,
        logs: notes.map((n) => ({ at: new Date().toISOString(), message: n })),
      }).eq("id", runId);
    }

    return json({ ok: true, updated, gsc: gscOk, notes });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[pruning-signals] failed:", msg);
    if (runId) {
      await client.from("pruning_runs").update({ status: "failed", error: msg, finished_at: new Date().toISOString() }).eq("id", runId);
    }
    return json({ error: "signals_failed", details: msg }, 500);
  }
});
