// seo-intel-worker — executes ONE SEO intelligence job per invocation.
//
// Bounded by design: claim one leased job → run it → mark done/failed →
// re-kick itself (with a cooldown and a depth budget) only when work remains.
// A 402/403 from any provider parks the whole engine instead of looping.

import {
  admin, cors, json, loadIntelSettings, withinSchedule, enqueue, invokeFn,
  logActivity, logAudit, parkEngine, markSource, notify, beat, JOB_LABELS, nowIso, today, dayOffset, SITE_URL,
} from "../_shared/seoIntel.ts";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import {
  gscConfigured, resolveGscSite, gscPageMetrics, gscQueryMetrics, gscIndexState,
  loadPagesSlice, SILO_SOURCES, scoreHealth, stripHtml, wordCount, classifyIntent, parseAIJson,
} from "../_shared/seoSignals.ts";

import { getKeywordMetrics, semrushSerp, semrushExpand, semrushConfigured } from "../_shared/keywordMetrics.ts";
import { firecrawlScrapeStrict, firecrawlConfigured, FirecrawlError } from "../_shared/firecrawlGateway.ts";
import { psiAudit, psiConfigured, PsiError } from "../_shared/pagespeed.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { ADVANCED_STAGES, validateRecommendation, upsertRecommendation } from "../_shared/seoIntel2.ts";
import { STATIC_ROUTES } from "../_shared/staticRoutes.ts";
import { scoreAeoGeo } from "../_shared/aeoGeoRules.ts";
import { applyRecommendation, canAutoApply } from "../_shared/seoApply.ts";




const MAX_DEPTH = 25;
const LEASE_SECONDS = 170;
const COOLDOWN_MS = 1500;

type Ctx = {
  sb: any;
  settings: any;
  job: any;
  siteUrl: string | null;
  note: (msg: string, records?: number) => Promise<void>;
  /** Live heartbeat: records the real step this job is on right now. */
  beat: (step: string, pct?: number, detail?: string, target?: string | null) => Promise<void>;
};


/* ───────────────────────── helpers ───────────────────────── */

async function resolveSite(sb: any, settings: any): Promise<string | null> {
  if (settings.gsc_site_url) return settings.gsc_site_url;
  if (!gscConfigured()) return null;
  const r = await resolveGscSite(SITE_URL);
  if (r.siteUrl) {
    await sb.from("seo_intel_settings").update({ gsc_site_url: r.siteUrl }).eq("id", true);
    return r.siteUrl;
  }
  return null;
}

const chunk = <T,>(arr: T[], n: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function upsertRows(sb: any, table: string, rows: any[], onConflict: string) {
  for (const part of chunk(rows, 400)) {
    const { error } = await sb.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

/* ───────────────────────── job handlers ───────────────────────── */

/** Actual per-page performance from Search Console (28d current vs previous). */
async function runGscPages(ctx: Ctx) {
  const { sb, siteUrl } = ctx;
  if (!siteUrl) {
    await markSource(sb, "search_console", { configured: gscConfigured(), status: "not_connected", last_error: "No verified property resolved" });
    return { skipped: "Search Console is not connected — link it to collect actual traffic data.", records: 0 };
  }
  const rawCur = await gscPageMetrics(siteUrl, dayOffset(30), dayOffset(2));
  const rawPrev = await gscPageMetrics(siteUrl, dayOffset(58), dayOffset(31));

  // Different URLs (trailing slash, query strings, casing) can normalise to the
  // same path, so aggregate before upserting — Postgres rejects a conflict that
  // touches the same row twice.
  const merge = (rows: typeof rawCur) => {
    const map = new Map<string, { path: string; clicks: number; impressions: number; ctr: number; position: number | null; posSum: number; imprSum: number }>();
    for (const r of rows) {
      if (!r.path) continue;
      const e = map.get(r.path) ?? { path: r.path, clicks: 0, impressions: 0, ctr: 0, position: null, posSum: 0, imprSum: 0 };
      e.clicks += r.clicks; e.impressions += r.impressions;
      if (r.position != null) { e.posSum += r.position * Math.max(r.impressions, 1); e.imprSum += Math.max(r.impressions, 1); }
      map.set(r.path, e);
    }
    return [...map.values()].map((e) => ({
      path: e.path,
      clicks: e.clicks,
      impressions: e.impressions,
      ctr: e.impressions ? Number((e.clicks / e.impressions).toFixed(4)) : 0,
      position: e.imprSum ? Number((e.posSum / e.imprSum).toFixed(2)) : null,
    }));
  };
  const cur = merge(rawCur);
  const prev = merge(rawPrev);
  const prevMap = new Map(prev.map((r) => [r.path, r]));

  const pageRows = cur.map((r) => {
    const p = prevMap.get(r.path);
    return {
      path: r.path,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      avg_position: r.position,
      prev_clicks: p?.clicks ?? null,
      prev_impressions: p?.impressions ?? null,
      prev_avg_position: p?.position ?? null,
      position_change: r.position != null && p?.position != null ? Number((p.position - r.position).toFixed(2)) : null,
      perf_window: "28d",
      perf_start_date: dayOffset(30),
      perf_end_date: dayOffset(2),
      perf_updated_at: nowIso(),
      data_sources: { performance: "gsc", label: "actual" },
      updated_at: nowIso(),
    };
  });
  await upsertRows(sb, "seo_intel_pages", pageRows, "path");

  await upsertRows(sb, "seo_intel_page_history", cur.map((r) => ({
    path: r.path, captured_on: today(), clicks: r.clicks, impressions: r.impressions,
    ctr: r.ctr, avg_position: r.position, data_source: "gsc",
  })), "path,captured_on,data_source");

  await markSource(sb, "search_console", {
    configured: true, status: "connected", last_sync_at: nowIso(), last_error: null,
    usage: { last_rows: cur.length, window: "28d" },
  });

  // Alerts: sharp position drops on pages that matter.
  for (const row of pageRows) {
    if (row.position_change != null && row.position_change <= -5 && (row.impressions ?? 0) >= 50) {
      await notify(sb, {
        kind: "position_drop", severity: "warn", path: row.path,
        title: `Position dropped ${Math.abs(row.position_change)} places`,
        body: `${row.path} moved from ${row.prev_avg_position?.toFixed(1)} to ${row.avg_position?.toFixed(1)} (Search Console, actual).`,
      });
    }
  }
  return { records: pageRows.length };
}

/** Actual query-level performance → keyword table. */
async function runGscQueries(ctx: Ctx) {
  const { sb, siteUrl } = ctx;
  if (!siteUrl) return { skipped: "Search Console is not connected.", records: 0 };
  const rows = await gscQueryMetrics(siteUrl, dayOffset(30), dayOffset(2));
  const prev = await gscQueryMetrics(siteUrl, dayOffset(58), dayOffset(31));

  const agg = new Map<string, { clicks: number; impressions: number; posSum: number; imprSum: number; path: string; bestClicks: number }>();
  for (const r of rows) {
    if (!r.query) continue;
    const e = agg.get(r.query) ?? { clicks: 0, impressions: 0, posSum: 0, imprSum: 0, path: r.path, bestClicks: -1 };
    e.clicks += r.clicks; e.impressions += r.impressions;
    if (r.position != null) { e.posSum += r.position * Math.max(r.impressions, 1); e.imprSum += Math.max(r.impressions, 1); }
    if (r.clicks > e.bestClicks) { e.bestClicks = r.clicks; e.path = r.path; }
    agg.set(r.query, e);
  }
  const prevAgg = new Map<string, { posSum: number; imprSum: number }>();
  for (const r of prev) {
    if (!r.query || r.position == null) continue;
    const e = prevAgg.get(r.query) ?? { posSum: 0, imprSum: 0 };
    e.posSum += r.position * Math.max(r.impressions, 1);
    e.imprSum += Math.max(r.impressions, 1);
    prevAgg.set(r.query, e);
  }

  const locale = ctx.settings.semrush_database || "in";
  const kwRows = [...agg.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 1500)
    .map(([keyword, e]) => {
      const pos = e.imprSum ? Number((e.posSum / e.imprSum).toFixed(2)) : null;
      const p = prevAgg.get(keyword);
      const prevPos = p?.imprSum ? Number((p.posSum / p.imprSum).toFixed(2)) : null;
      return {
        keyword, locale,
        target_path: e.path,
        clicks: e.clicks,
        impressions: e.impressions,
        ctr: e.impressions ? Number((e.clicks / e.impressions).toFixed(4)) : 0,
        current_position: pos,
        previous_position: prevPos,
        position_change: pos != null && prevPos != null ? Number((prevPos - pos).toFixed(2)) : null,
        position_source: "gsc",
        intent: classifyIntent(keyword),
        last_checked_at: nowIso(),
        updated_at: nowIso(),
      };
    });
  await upsertRows(sb, "seo_intel_keywords", kwRows, "keyword,locale");
  await upsertRows(sb, "seo_intel_rank_history", kwRows.map((k) => ({
    keyword: k.keyword, locale, captured_on: today(), position: k.current_position,
    clicks: k.clicks, impressions: k.impressions, ctr: k.ctr, path: k.target_path, data_source: "gsc",
  })), "keyword,locale,captured_on,data_source");

  return { records: kwRows.length };
}

/** On-page technical + content snapshot straight from our own content tables. */
/**
 * Static routes rendered as inventory rows (they have no CMS row).
 */
function staticInventory(): any[] {
  return STATIC_ROUTES.map((r) => ({
    path: r.path,
    name: null as string | null,
    page_type: "static",
    source_table: "static_routes",
    source_id: r.path,
    source_field: "",
    keyword: null as string | null,
    topic: null as string | null,
    html: "",
    text: "",
    words: 0,
  }));
}

/**
 * Walks the whole site source-by-source using a (sourceIndex, offset) cursor so
 * one invocation only materialises the window it is about to write. Index
 * `SILO_SOURCES.length` is the static-routes pass, after which the sweep is
 * complete.
 */
async function runCrawlPages(ctx: Ctx) {
  const { sb, job } = ctx;
  const srcIdx = Number(job.payload?.src ?? 0);
  const offset = Number(job.payload?.offset ?? 0);
  const limit = Math.max(25, Number(ctx.settings.max_pages_per_run ?? 25) * 6);
  const sourceCount = SILO_SOURCES.length;

  let slice: any[] = [];
  let nextSrc = srcIdx;
  let nextOffset = offset;
  let label = "";

  if (srcIdx < sourceCount) {
    slice = await loadPagesSlice(sb, srcIdx, offset, limit);
    label = `${SILO_SOURCES[srcIdx].table} ${offset}-${offset + slice.length}`;
    if (slice.length < limit) { nextSrc = srcIdx + 1; nextOffset = 0; }
    else { nextOffset = offset + limit; }
  } else {
    slice = staticInventory().slice(offset, offset + limit);
    label = `static routes ${offset}-${offset + slice.length}`;
    nextSrc = srcIdx + 1; nextOffset = 0;
  }
  const sweepDone = srcIdx >= sourceCount;


  const paths = slice.map((p) => p.path);
  const known = new Set<string>();
  const perfMap = new Map<string, any>();
  // Chunked so a large slice never exceeds the URL length limit of `.in()`.
  for (let i = 0; i < paths.length; i += 200) {
    const { data: perf } = await sb.from("seo_intel_pages")
      .select("path, clicks, impressions, ctr, avg_position")
      .in("path", paths.slice(i, i + 200));
    for (const row of perf ?? []) {
      known.add(row.path);
      perfMap.set(row.path, row);
    }
  }
  const newPaths = paths.filter((p) => !known.has(p));

  const rows = slice.map((p) => {
    const html = p.html ?? "";
    const text = p.text ?? "";
    const raw: Record<string, any> = (p as any).raw ?? {};
    // Real stored metadata wins; the body-text clip is only a last resort so the
    // "description length" lever measures the actual meta tag, not a 300-char slice.
    const metaTitle: string | null = (raw.meta_title ?? "").toString().trim() || null;
    const metaDesc: string | null = (raw.meta_description ?? "").toString().trim() || null;
    const h1FromCol: string | null = (raw.h1_tag ?? "").toString().trim() || null;
    const h1FromHtml = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? null;
    const h1 = h1FromCol || (h1FromHtml ? stripHtml(h1FromHtml).trim() || null : null);
    const headingCount = (html.match(/<h[1-6][\s>]/gi) ?? []).length;
    const words = p.words ?? wordCount(stripHtml(text));
    const hasSchema = /application\/ld\+json|itemtype=/i.test(html);
    const faqCount = (html.match(/<h3|faq/gi) ?? []).length;
    const internalOut = (html.match(/href="\/(?!\/)/g) ?? []).length;
    const perfRow: any = perfMap.get(p.path) ?? {};
    const health = scoreHealth({
      words,
      hasTitle: !!p.name,
      hasDescription: text.length > 80,
      hasKeyword: !!p.keyword,
      schemaValid: hasSchema,
      faqCount,
      internalLinks: internalOut,
      duplicationScore: 0,
      entityCoverage: p.keyword ? 70 : 40,
      clicks: perfRow.clicks ?? 0,
      impressions: perfRow.impressions ?? 0,
      ctr: perfRow.ctr ?? 0,
      position: perfRow.avg_position ?? null,
      decayState: "stable",
    });
    // Deterministic AEO/GEO grade of the CMS content we own for this page.
    const aeo = scoreAeoGeo(html || text, { entityName: p.name ?? undefined, requireFaq: false });
    return {
      path: p.path,
      page_type: p.page_type,
      entity_name: p.name,
      title: metaTitle || p.name,
      meta_description: metaDesc || stripHtml(text).slice(0, 160).trim() || null,
      h1: h1,
      heading_count: headingCount,
      word_count: words,
      has_schema: hasSchema,
      internal_links_out: internalOut,
      health_score: health.health_score,
      health_issues: health.issues,
      primary_keyword: p.keyword,
      aeo_score: aeo.score,
      aeo_grade: aeo.grade,
      aeo_failed: aeo.failed.map((c) => ({ id: c.id, label: c.label, detail: c.detail ?? null })),
      aeo_checked_at: nowIso(),
      last_crawl_at: nowIso(),
      discovered_by: p.source_table === "static_routes" ? "static_routes" : p.source_table,
      data_sources: { onpage: "internal", label: "calculated" },
      updated_at: nowIso(),
    };
  });
  if (rows.length) await upsertRows(sb, "seo_intel_pages", rows, "path");

  // Brand-new pages jump the queue: they get analysed (SEO/AEO/GEO) first.
  if (newPaths.length) {
    await logActivity(sb, {
      event: `${newPaths.length} new page(s) discovered`,
      detail: newPaths.slice(0, 12).join(", ") + (newPaths.length > 12 ? ` +${newPaths.length - 12} more` : ""),
      level: "success", job_id: ctx.job.id, job_type: "crawl_pages", records: newPaths.length,
    });
    await enqueue(sb, {
      job_type: "analyze",
      payload: { paths: newPaths.slice(0, 40), reason: "new_pages" },
      priority: 1,
      dedupe_key: `analyze:new:${today()}:${srcIdx}:${offset}`,
      triggered_by: "worker",
    }).catch(() => {});
    await notify(sb, {
      kind: "pages_discovered", severity: "info",
      title: `${newPaths.length} new page(s) added to the SEO engine`,
      body: `They are queued for SEO/AEO/GEO analysis right away: ${newPaths.slice(0, 5).join(", ")}`,
    }).catch(() => {});
  }

  if (!sweepDone) {
    await enqueue(sb, {
      job_type: "crawl_pages",
      payload: { src: nextSrc, offset: nextOffset },
      priority: 3,
      dedupe_key: `crawl_pages:${nextSrc}:${nextOffset}`,
      triggered_by: "worker",
    }).catch(() => {});
  } else {
    // Inventory complete — start/continue the rotational optimisation sweep.
    await enqueue(sb, {
      job_type: "analyze",
      payload: { rotate: true },
      priority: 2,
      dedupe_key: `analyze:rotate:${new Date().toISOString().slice(0, 13)}`,
      triggered_by: "worker",
    }).catch(() => {});
  }
  return {
    records: rows.length,
    detail: `${label}${newPaths.length ? ` · ${newPaths.length} new` : ""}`,
  };
}




/**
 * Bounded-concurrency map. Provider calls are latency-bound, so running a small
 * pool converts a 4-page-per-run sweep into a 24-40 page one without raising
 * per-request cost or exceeding provider rate limits.
 */
async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      try { await fn(item); } catch { /* per-item errors are handled by fn */ }
    }
  });
  await Promise.all(workers);
}

/** Semrush volume / difficulty / CPC / 12-month trend for tracked keywords. */
async function runKeywordMetrics(ctx: Ctx) {
  const { sb, settings } = ctx;
  if (!semrushConfigured()) {
    await markSource(sb, "semrush", { configured: false, status: "not_connected", last_error: "Semrush connector not linked" });
    return { skipped: "Semrush is not connected — search volume stays unavailable rather than estimated.", records: 0 };
  }
  const locale = settings.semrush_database || "in";
  const { data: stale } = await sb.from("seo_intel_keywords")
    .select("keyword")
    .eq("locale", locale)
    .eq("is_tracked", true)
    .or(`last_checked_at.is.null,search_volume.is.null`)
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(60);

  let keywords = (stale ?? []).map((k: any) => k.keyword);
  if (!keywords.length) {
    const { data: top } = await sb.from("seo_intel_keywords")
      .select("keyword").eq("locale", locale).eq("is_tracked", true)
      .order("last_checked_at", { ascending: true, nullsFirst: true }).limit(40);
    keywords = (top ?? []).map((k: any) => k.keyword);
  }
  if (!keywords.length) return { skipped: "No keywords tracked yet — run the Search Console sync first.", records: 0 };

  const { metrics, health } = await getKeywordMetrics(keywords, { locale, withGsc: false });
  const rows = metrics.filter((m) => m.verified || m.searchVolume != null).map((m) => ({
    keyword: m.keyword, locale: m.locale,
    search_volume: m.searchVolume,
    volume_source: m.volumeSource,
    difficulty: m.difficulty,
    difficulty_source: m.difficultySource,
    competition: m.competition,
    cpc: m.cpc,
    monthly_trend: m.monthlyTrend,
    last_checked_at: nowIso(),
    updated_at: nowIso(),
  }));
  if (rows.length) await upsertRows(sb, "seo_intel_keywords", rows, "keyword,locale");

  await markSource(sb, "semrush", {
    configured: true,
    status: health.semrush.ok === false ? "error" : "connected",
    last_sync_at: nowIso(),
    last_error: health.semrush.error ?? null,
    usage: { live_fetches: health.liveFetches, cache_hits: health.cacheHits },
  });
  return { records: rows.length, detail: `${rows.length}/${keywords.length} keywords returned provider data` };
}

/** Daily rank snapshot (uses whatever actual source is available). */
async function runRankTrack(ctx: Ctx) {
  const { sb, settings } = ctx;
  const locale = settings.semrush_database || "in";
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, current_position, best_position, target_path, clicks, impressions, ctr")
    .eq("locale", locale).eq("is_tracked", true)
    .not("current_position", "is", null)
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(800);
  const rows = (kws ?? []).map((k: any) => ({
    keyword: k.keyword, locale, captured_on: today(),
    position: k.current_position, clicks: k.clicks, impressions: k.impressions,
    ctr: k.ctr, path: k.target_path, data_source: "gsc",
  }));
  if (rows.length) await upsertRows(sb, "seo_intel_rank_history", rows, "keyword,locale,captured_on,data_source");

  // Keep a running best position.
  for (const k of kws ?? []) {
    if (k.current_position != null && (k.best_position == null || k.current_position < k.best_position)) {
      await sb.from("seo_intel_keywords").update({ best_position: k.current_position })
        .eq("keyword", k.keyword).eq("locale", locale);
    }
  }
  return { records: rows.length };
}

/** Who outranks us, and what they do differently. */
async function runCompetitorScan(ctx: Ctx) {
  const { sb, settings } = ctx;
  if (!semrushConfigured()) return { skipped: "Semrush is not connected — competitor SERP data unavailable.", records: 0 };
  const locale = settings.semrush_database || "in";
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, current_position, target_path")
    .eq("locale", locale).eq("is_tracked", true)
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(10);
  if (!kws?.length) return { skipped: "No keywords to scan yet.", records: 0 };

  let stored = 0;
  for (const k of kws) {
    let serp: Awaited<ReturnType<typeof semrushSerp>>;
    try {
      serp = await semrushSerp(k.keyword, locale);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Quota / plan limit: park the stage with a clear, honest status instead of reporting zero.
      await markSource(sb, "semrush", {
        configured: true, status: "error", last_error: msg, last_sync_at: nowIso(),
      });
      return {
        skipped: `Semrush API limit reached — competitor SERP data paused until the plan quota resets (${msg.slice(0, 120)})`,
        records: stored,
      };
    }
    for (const s of serp.slice(0, 5)) {
      if (!s.domain || /mbacompass\.in/i.test(s.domain)) continue;
      const { error: cErr } = await sb.from("seo_intel_competitors").upsert({
        domain: s.domain,
        keyword: k.keyword,
        our_path: k.target_path,
        their_url: s.url,
        their_position: s.position,
        our_position: k.current_position,
        data_source: "semrush",
        last_checked_at: nowIso(),
        updated_at: nowIso(),
      }, { onConflict: "domain,keyword" });
      if (cErr) throw new Error(`seo_intel_competitors upsert: ${cErr.message}`);
      const { error: hErr } = await sb.from("seo_intel_competitor_history").upsert({
        domain: s.domain, keyword: k.keyword, captured_on: today(),
        position: s.position, our_position: k.current_position, data_source: "semrush",
      }, { onConflict: "domain,keyword,captured_on" });
      if (hErr) throw new Error(`seo_intel_competitor_history upsert: ${hErr.message}`);
      stored++;
    }
  }
  await markSource(sb, "semrush", { configured: true, status: "connected", last_error: null, last_sync_at: nowIso() });
  return { records: stored };
}


/** Actual indexing state per URL from Search Console URL Inspection. */
async function runIndexCheck(ctx: Ctx) {
  const { sb, siteUrl, job } = ctx;
  if (!siteUrl) return { skipped: "Search Console is not connected — indexing state unavailable.", records: 0 };
  const cursor = Number(job.payload?.cursor ?? 0);
  const batch = Math.max(1, Math.min(60, Number(job.payload?.batch ?? 40)));
  const deadline = Date.now() + 90_000; // stay well inside the function timeout
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path")
    .order("indexed_checked_at", { ascending: true, nullsFirst: true })
    .range(0, batch - 1);
  let done = 0;
  const inspect = async (p: { path: string }) => {
    if (Date.now() > deadline) return;
    let state: string | null = null;
    try {
      state = await gscIndexState(siteUrl, `${SITE_URL}${p.path}`);
    } catch (_e) {
      state = null; // a single URL failing must not fail the whole stage
    }
    // Canonical status so the "Indexed by Google" lever can actually pass:
    // Search Console returns verbose phrases like "Submitted and indexed".
    const canonical = !state
      ? "unknown"
      : /indexed(,| and )?|^Submitted and indexed$/i.test(state) && !/not indexed/i.test(state)
        ? "indexed"
        : "not_indexed";
    await sb.from("seo_intel_pages").update({
      indexed_status: canonical,
      indexed_checked_at: nowIso(),
    }).eq("path", p.path);
    if (state && canonical !== "indexed") {
      await sb.from("seo_intel_console_tasks").upsert({
        url: `${SITE_URL}${p.path}`,
        action: "request_indexing",
        status: "pending",
        reason: state,
        coverage_state: state,
        last_inspected_at: nowIso(),
      }, { onConflict: "url,action" }).select("id").maybeSingle();
    }
    done++;
  };
  await runPool(pages ?? [], 6, inspect);

  await markSource(sb, "gsc_url_inspection", { configured: true, status: "connected", last_sync_at: nowIso() });

  // Keep sweeping until every page has a verified index status (bounded depth).
  const { count: unchecked } = await sb.from("seo_intel_pages")
    .select("path", { count: "exact", head: true }).is("indexed_checked_at", null);
  const depth = Number(job.payload?.depth ?? 0);
  if ((unchecked ?? 0) > 0 && done > 0 && depth < 12) {
    await enqueue(sb, {
      job_type: "index_check", priority: 5,
      payload: { batch, depth: depth + 1 },
      dedupe_key: `index_check:sweep:${depth + 1}:${new Date().toISOString().slice(0, 13)}`,
      triggered_by: "worker",
    }).catch(() => {});
  }
  return { records: done, detail: `inspected ${done} URL(s) from cursor ${cursor} · ${unchecked ?? 0} never checked` };
}

/* ─────────── Firecrawl: what a crawler actually receives (live HTML) ─────────── */

async function runLiveCrawl(ctx: Ctx) {
  const { sb, job } = ctx;
  if (!firecrawlConfigured()) {
    await markSource(sb, "firecrawl", { configured: false, status: "not_connected", last_error: "Firecrawl connector not linked" });
    return { skipped: "Firecrawl is not connected.", records: 0 };
  }

  // Firecrawl's plan allows ~10 requests/minute, so the sweep is paced instead of
  // bursty: a small pool plus a shared 6.5s slot keeps us just under the limit,
  // and the job re-queues itself so the sweep never stops.
  const batch = Math.max(1, Math.min(16, Number(job.payload?.batch ?? 12)));
  const MIN_GAP_MS = 6_500;
  let nextSlot = Date.now();
  const takeSlot = async () => {
    const wait = nextSlot - Date.now();
    nextSlot = Math.max(Date.now(), nextSlot) + MIN_GAP_MS;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  };
  const deadline = Date.now() + 110_000;

  // Highest-value pages first, then anything never checked / checked longest ago.
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path, title, primary_keyword, word_count, has_schema")
    .order("live_crawl_at", { ascending: true, nullsFirst: true })
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(batch);
  if (!pages?.length) return { skipped: "No pages to crawl yet.", records: 0 };

  let done = 0;
  let gaps = 0;
  let halted: string | null = null;
  const crawlOne = async (p: any) => {
    if (Date.now() > deadline || halted) return;
    await takeSlot();
    if (Date.now() > deadline || halted) return;
    const url = `${SITE_URL}${p.path}`;
    try {
      const res = await firecrawlScrapeStrict(url, { formats: ["markdown", "rawHtml"], onlyMainContent: false, timeoutMs: 45_000 });
      const doc = res?.data ?? res ?? {};
      const html: string = doc.rawHtml ?? doc.html ?? "";
      const md: string = doc.markdown ?? "";
      const meta = doc.metadata ?? {};

      const renderedTitle: string | null = meta.title ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null);
      const renderedH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? null;
      const words = wordCount(md || stripHtml(html));
      const hasSchema = /application\/ld\+json/i.test(html);
      const linksOut = (html.match(/href="\/(?!\/)/g) ?? []).length;
      // An SSR gap = the crawler-visible HTML is missing content the page should ship.
      const ssrGap = words < 200 || !renderedTitle || !hasSchema;
      if (ssrGap) gaps++;

      // AEO/GEO compliance of the crawler-visible HTML (deterministic, no AI cost).
      const aeo = scoreAeoGeo(html, {
        entityName: (p.title as string | null) ?? undefined,
        requireFaq: true,
      });

      await sb.from("seo_intel_pages").update({
        rendered_title: renderedTitle ? renderedTitle.slice(0, 300) : null,
        rendered_h1: renderedH1 ? stripHtml(renderedH1).slice(0, 300) : null,
        rendered_word_count: words,
        rendered_has_schema: hasSchema,
        rendered_links_out: linksOut,
        ssr_gap: ssrGap,
        aeo_score: aeo.score,
        aeo_grade: aeo.grade,
        aeo_failed: aeo.failed.map((c) => ({ id: c.id, label: c.label, detail: c.detail ?? null })),
        aeo_checked_at: nowIso(),
        live_crawl_at: nowIso(),
        live_crawl_error: null,
        updated_at: nowIso(),
      }).eq("path", p.path);

      done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof FirecrawlError ? e.status : 0;
      // Credits / policy / rate limits are engine-wide problems, not page problems.
      if (status === 429) {
        // Pacing problem, not an outage: stop this run and let the next hop retry.
        halted = msg;
        nextSlot = Date.now() + 30_000;
        return;
      }
      if (status === 402 || status === 403 || status === 401) {
        halted = msg;
        await markSource(sb, "firecrawl", { configured: true, status: "error", last_error: msg, last_tested_at: nowIso() });
        return;
      }
      await sb.from("seo_intel_pages").update({
        live_crawl_at: nowIso(), live_crawl_error: msg.slice(0, 300), updated_at: nowIso(),
      }).eq("path", p.path);
    }
  };
  await runPool(pages, 2, crawlOne);

  const rateLimited = !!halted && /429|rate limit/i.test(String(halted));
  if (!halted) {
    await markSource(sb, "firecrawl", { configured: true, status: "connected", last_error: null, last_sync_at: nowIso() });
  }

  // Rotational sweep: keep going while pages have never been crawler-checked.
  const { count: never } = await sb.from("seo_intel_pages")
    .select("path", { count: "exact", head: true }).is("live_crawl_at", null);
  const depth = Number(job.payload?.depth ?? 0);
  if ((never ?? 0) > 0 && (done > 0 || rateLimited) && depth < 24) {
    await enqueue(sb, {
      job_type: "live_crawl", priority: 5,
      payload: { batch, depth: depth + 1 },
      dedupe_key: `live_crawl:sweep:${depth + 1}:${new Date().toISOString().slice(0, 13)}`,
      triggered_by: "worker",
    }).catch(() => {});
  }
  if (halted && !rateLimited) {
    return { skipped: `Firecrawl unavailable — live crawling paused (${String(halted).slice(0, 140)})`, records: done };
  }
  return {
    records: done,
    detail: `live-crawled ${done} page(s), ${gaps} with a crawler-visibility gap · ${never ?? 0} never checked${rateLimited ? " · paced by Firecrawl rate limit" : ""}`,
  };
}

/* ─────────── PageSpeed Insights: real Core Web Vitals per page ─────────── */

async function runSpeedAudit(ctx: Ctx) {
  const { sb, job } = ctx;
  const strategy: "mobile" | "desktop" = job.payload?.strategy === "desktop" ? "desktop" : "mobile";
  const batch = Math.max(1, Math.min(8, Number(job.payload?.batch ?? 6))); // PSI is slow (~20-40s/URL)
  const deadline = Date.now() + 110_000;

  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path")
    .order("psi_checked_at", { ascending: true, nullsFirst: true })
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(batch);
  if (!pages?.length) return { skipped: "No pages to audit yet.", records: 0 };

  let done = 0;
  let psiHalt: { status: number; msg: string } | null = null;
  const auditOne = async (p: any) => {
    if (Date.now() > deadline || psiHalt) return;
    const url = `${SITE_URL}${p.path}`;
    try {
      const m = await psiAudit(url, strategy, 60_000);
      await sb.from("seo_intel_pages").update({
        psi_perf_score: m.perf_score,
        psi_seo_score: m.seo_score,
        psi_lcp_ms: m.lcp_ms,
        psi_cls: m.cls,
        psi_tbt_ms: m.tbt_ms,
        psi_fcp_ms: m.fcp_ms,
        psi_strategy: m.strategy,
        psi_opportunities: m.opportunities,
        psi_checked_at: nowIso(),
        updated_at: nowIso(),
      }).eq("path", p.path);

      await sb.from("seo_intel_speed_history").upsert({
        path: p.path, captured_on: today(), strategy: m.strategy,
        perf_score: m.perf_score, seo_score: m.seo_score,
        lcp_ms: m.lcp_ms, cls: m.cls, tbt_ms: m.tbt_ms, fcp_ms: m.fcp_ms,
        data_source: "pagespeed",
      }, { onConflict: "path,captured_on,strategy" });
      done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof PsiError ? e.status : 0;
      // Quota (429) and key/referrer restrictions (403) block every URL equally.
      if (status === 429 || status === 403 || status === 400 || status === 401) {
        psiHalt = { status, msg };
        await markSource(sb, "pagespeed", {
          configured: psiConfigured(), status: "error", last_error: msg, last_tested_at: nowIso(),
        });
        return;
      }
      await ctx.note(`PageSpeed failed for ${p.path}: ${msg.slice(0, 160)}`);
    }
  };
  await runPool(pages, 3, auditOne);

  if (psiHalt) {
    const h = psiHalt as { status: number; msg: string };
    return {
      skipped: h.status === 429
        ? `PageSpeed daily quota exhausted — speed audits resume after the quota resets (${h.msg.slice(0, 120)})`
        : `PageSpeed API rejected the request — ${h.msg.slice(0, 160)}`,
      records: done,
    };
  }

  await markSource(sb, "pagespeed", {
    configured: psiConfigured(), status: "connected", last_error: null, last_sync_at: nowIso(),
  });
  return { records: done, detail: `audited ${done} page(s) on ${strategy}` };
}


/** AI analysis over the stored signals → concrete, evidence-backed recommendations. */
async function runAnalyze(ctx: Ctx) {
  const { sb, job } = ctx;
  const PAGE_COLS = "path, page_type, title, meta_description, word_count, has_schema, internal_links_out, health_score, health_issues, clicks, impressions, ctr, avg_position, prev_avg_position, position_change, primary_keyword, indexed_status, aeo_score, aeo_grade, aeo_failed, rendered_word_count, rendered_has_schema, ssr_gap, psi_perf_score, psi_lcp_ms, psi_cls, psi_tbt_ms, psi_opportunities, last_analyzed_at, analysis_round";
  // Site-wide coverage: analyse a much larger slice per run so every page
  // family keeps moving instead of a dozen pages a day.
  const batchSize = Math.max(12, Math.min(60, Number(ctx.settings.max_pages_per_run ?? 12) * 3));

  const explicitPaths: string[] = Array.isArray(job.payload?.paths) ? job.payload.paths : [];

  let pages: any[] | null = null;
  if (explicitPaths.length) {
    // Newly discovered pages — analysed ahead of the rotation.
    const { data } = await sb.from("seo_intel_pages").select(PAGE_COLS)
      .in("path", explicitPaths.slice(0, batchSize));
    pages = data ?? [];
  } else {
    // ROTATION: never-analysed pages first, then the longest-untouched ones, so
    // 100% of the site (not just the high-impression head) keeps getting
    // SEO / AEO / GEO work, round after round.
    const { data } = await sb.from("seo_intel_pages").select(PAGE_COLS)
      .order("last_analyzed_at", { ascending: true, nullsFirst: true })
      .order("impressions", { ascending: false, nullsFirst: false })
      .limit(batchSize);
    pages = data ?? [];
  }
  if (!pages?.length) return { skipped: "No page data collected yet.", records: 0 };


  const { data: comps } = await sb.from("seo_intel_competitors")
    .select("domain, keyword, their_position, our_position").limit(20);

  const prompt = `You are a senior technical SEO analyst for mbacompass.in (Indian MBA admissions).
Analyse the REAL data below and produce specific, implementable recommendations.

RULES:
- Only use the numbers given. Never invent traffic, volume or rankings.
- Each recommendation must name the exact problem, the evidence (quote the numbers given), why it matters, the concrete change, and a before/after value where a text change is proposed.
- Prefer changes that can be applied to title, meta description, headings, internal links, schema or content depth.
- Cover all three layers for EVERY page in the list, not only the high-traffic ones:
  · SEO — title/meta/heading/keyword/internal-link/indexing quality.
  · AEO (answer engines) — is there a direct one-paragraph answer near the top, an FAQ block with real questions, definition/entity clarity, and FAQPage/HowTo/Article schema?
  · GEO (generative engines) — factual, citable statements with named entities (IIM, CAT, NIRF, fees, cutoffs, years), stat-rich sentences an LLM can quote, and unique data no competitor page has.
- A page with low or zero impressions is still in scope: recommend the AEO/GEO and depth work that would make it rankable.
- confidence is 0-1. priority is one of high | medium | low.
- category is one of: technical, content, keywords, internal_links, schema, ctr, indexing, competitor, aeo, geo.


PAGES (Search Console = actual; on-page = from our CMS; rendered_* / ssr_gap = what Firecrawl actually received from the live URL; psi_* = real Google PageSpeed/Lighthouse mobile measurements, lcp/tbt in ms):
${JSON.stringify(pages, null, 1)}

Interpretation rules for the extra signals:
- ssr_gap true, or rendered_word_count far below word_count, means crawlers do not see the content — treat as a technical/indexing blocker with the highest priority.
- rendered_has_schema false while has_schema true means schema is injected client-side only.
- aeo_score (0-100), aeo_grade and aeo_failed come from our deterministic AEO/GEO rulebook check on this page. Every failed check in aeo_failed MUST produce a recommendation in category "aeo" or "geo" for that page, naming the failed check and the exact fix (answer-first paragraph, key-facts table, question-shaped headings, FAQ block, fact density, semantic tables, heading order). Pages with aeo_score below 75 are high priority.
- Flag speed only from psi_* values: LCP > 2500ms, CLS > 0.1 or TBT > 200ms, and cite psi_opportunities titles.
- Where a psi_* or rendered_* field is null, that page has not been measured yet — say so instead of guessing.

COMPETITOR SERP SNAPSHOT (Semrush, estimated positions):
${JSON.stringify(comps ?? [], null, 1)}

Return STRICT JSON: {"recommendations":[{"path":"","keyword":"","category":"","change_type":"","problem":"","evidence":"","why_it_matters":"","recommended_change":"","before_value":"","after_value":"","expected_impact":"","confidence":0.0,"priority":"high"}]}`;

  const res = await callAIGateway({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are a precise SEO analyst. Output strict JSON only. Never fabricate metrics." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  }, { feature: "seo-intel-analyze" });

  if (!res.ok) {
    const body = await res.text();
    const err: any = new Error(`AI analysis failed [${res.status}]: ${body.slice(0, 300)}`);
    err.providerStatus = res.status;
    throw err;
  }
  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "";
  const parsed = parseAIJson<{ recommendations: any[] }>(raw);
  const recs = parsed?.recommendations ?? [];

  let inserted = 0;
  let suppressed = 0;
  let updated = 0;
  // No artificial cap: every recommendation the model produced for this batch is
  // validated and stored (deduped downstream), so the queue reflects real work.
  for (const r of recs.slice(0, 150)) {

    if (!r?.problem) continue;
    const candidate = {
      path: r.path ?? null,
      keyword: r.keyword ?? null,
      category: r.category ?? "general",
      change_type: r.change_type ?? null,
      problem: r.problem,
      evidence: { note: r.evidence ?? null, sources: ["gsc", "internal", "semrush"] },
      why_it_matters: r.why_it_matters ?? null,
      recommended_change: r.recommended_change ?? null,
      before_value: r.before_value ?? null,
      after_value: r.after_value ?? null,
      expected_impact: r.expected_impact ?? null,
      confidence: typeof r.confidence === "number" ? r.confidence : null,
      priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
      data_source: "openai+gsc",
      ai_model: "gpt-4.1-mini",
      auto_appliable: ["title", "meta_description", "meta"].includes(String(r.change_type ?? "").toLowerCase()),
    };
    // Self-validation: every recommendation must survive a check against the
    // stored evidence before it is ever shown to an admin.
    const validation = await validateRecommendation(sb, candidate);
    if (!validation.ok) {
      suppressed++;
      await logActivity(sb, {
        event: "Recommendation suppressed",
        detail: `${candidate.path ?? "site"} — ${validation.reason}`,
        level: "warn", job_type: "analyze",
      });
      continue;
    }
    const outcome = await upsertRecommendation(sb, candidate, validation);
    if (outcome === "inserted") inserted++;
    else if (outcome === "updated") updated++;
  }

  await markSource(sb, "openai", { configured: true, status: "connected", last_sync_at: nowIso() });

  // Stamp the rotation so these pages move to the back of the queue and the
  // next batch is a different slice of the site.
  const analysedPaths = pages.map((p: any) => p.path);
  for (const p of pages as any[]) {
    await sb.from("seo_intel_pages").update({
      last_analyzed_at: nowIso(),
      analysis_round: Number(p.analysis_round ?? 0) + 1,
      updated_at: nowIso(),
    }).eq("path", p.path);
  }

  // Keep sweeping: how much of the site has never been analysed yet?
  const { count: pending } = await sb.from("seo_intel_pages")
    .select("path", { count: "exact", head: true })
    .is("last_analyzed_at", null);
  if ((pending ?? 0) > 0) {
    await enqueue(sb, {
      job_type: "analyze",
      payload: { rotate: true },
      priority: 2,
      dedupe_key: `analyze:rotate:${nowIso().slice(0, 16)}`,
      triggered_by: "worker",
    }).catch(() => {});
  }

  if (inserted) {
    await notify(sb, {
      kind: "recommendations", severity: "info",
      title: `${inserted} new SEO recommendation(s) ready`,
      body: "Open the Recommendations tab to review, approve or reject them.",
    });
  }
  return {
    records: inserted,
    detail: `${analysedPaths.length} page(s) analysed · ${inserted} new, ${updated} refreshed, ${suppressed} suppressed · ${pending ?? 0} page(s) still awaiting first pass`,
  };


}

/** Did applied changes actually help? Compare rank/traffic before vs after. */
async function runVerify(ctx: Ctx) {
  const { sb } = ctx;
  const targetId = (ctx.job.payload as any)?.experiment_id as string | undefined;
  let q = sb.from("seo_intel_experiments").select("*").is("result_captured_on", null).limit(30);
  if (targetId) q = sb.from("seo_intel_experiments").select("*").eq("id", targetId).limit(1);
  const { data: exps } = await q;
  let measured = 0;
  for (const e of exps ?? []) {
    // An admin-requested verification still measures only what history actually holds.
    if (!targetId && e.measure_after && new Date(e.measure_after) > new Date()) continue;

    const { data: hist } = await sb.from("seo_intel_page_history")
      .select("clicks, impressions, avg_position, captured_on")
      .eq("path", e.path).order("captured_on", { ascending: false }).limit(1).maybeSingle();
    if (!hist) continue;
    const posDelta = e.baseline_position != null && hist.avg_position != null
      ? Number((e.baseline_position - hist.avg_position).toFixed(2)) : null;
    const clicksDelta = e.baseline_clicks != null && hist.clicks != null ? hist.clicks - e.baseline_clicks : null;
    const outcome = posDelta == null ? "pending" : posDelta > 0.5 ? "improved" : posDelta < -0.5 ? "declined" : "no_change";
    await sb.from("seo_intel_experiments").update({
      result_position: hist.avg_position,
      result_clicks: hist.clicks,
      result_impressions: hist.impressions,
      result_captured_on: hist.captured_on,
      position_delta: posDelta,
      clicks_delta: clicksDelta,
      outcome,
    }).eq("id", e.id);
    if (e.recommendation_id) {
      await sb.from("seo_intel_recommendations").update({
        status: "verified",
        verified_at: nowIso(),
        verification: { outcome, position_delta: posDelta, clicks_delta: clicksDelta, source: "gsc" },
      }).eq("id", e.recommendation_id);
    }
    measured++;
  }
  return { records: measured };
}

/** Daily / weekly rollup stored for the Reports tab. */
async function runReport(ctx: Ctx) {
  const { sb } = ctx;
  const [{ data: pages }, { data: recs }, { data: tasks }, { data: exps }] = await Promise.all([
    sb.from("seo_intel_pages").select("path, clicks, impressions, avg_position, position_change, health_score, indexed_status"),
    sb.from("seo_intel_recommendations").select("status, priority, category"),
    sb.from("seo_intel_tasks").select("status"),
    sb.from("seo_intel_experiments").select("outcome, position_delta, path"),
  ]);
  const list = pages ?? [];
  const clicks = list.reduce((s: number, p: any) => s + (p.clicks ?? 0), 0);
  const impressions = list.reduce((s: number, p: any) => s + (p.impressions ?? 0), 0);
  const positions = list.map((p: any) => p.avg_position).filter((v: any) => v != null);
  const avgPos = positions.length ? Number((positions.reduce((a: number, b: number) => a + b, 0) / positions.length).toFixed(2)) : null;
  const gained = list.filter((p: any) => (p.position_change ?? 0) > 0).length;
  const lost = list.filter((p: any) => (p.position_change ?? 0) < 0).length;
  const notIndexed = list.filter((p: any) => p.indexed_status && !/index/i.test(p.indexed_status)).length;

  const payload = {
    pages_tracked: list.length,
    clicks, impressions, avg_position: avgPos,
    pages_improved: gained, pages_declined: lost, pages_not_indexed: notIndexed,
    recommendations: {
      total: (recs ?? []).length,
      open: (recs ?? []).filter((r: any) => ["new", "review"].includes(r.status)).length,
      applied: (recs ?? []).filter((r: any) => r.status === "applied" || r.status === "verified").length,
    },
    tasks: {
      total: (tasks ?? []).length,
      open: (tasks ?? []).filter((t: any) => !["completed", "rejected"].includes(t.status)).length,
    },
    experiments: {
      improved: (exps ?? []).filter((e: any) => e.outcome === "improved").length,
      declined: (exps ?? []).filter((e: any) => e.outcome === "declined").length,
      no_change: (exps ?? []).filter((e: any) => e.outcome === "no_change").length,
    },
  };
  const summary = `${clicks} clicks and ${impressions} impressions across ${list.length} tracked pages (Search Console, actual). ${gained} pages improved, ${lost} declined. ${payload.recommendations.open} recommendations awaiting review.`;
  await sb.from("seo_intel_reports").insert({
    report_type: "daily",
    period_start: dayOffset(30), period_end: dayOffset(2),
    summary, payload,
    data_sources: { performance: "gsc (actual)", keywords: "semrush (estimated)", onpage: "internal (calculated)", analysis: "openai (ai)" },
  });
  await sb.from("seo_intel_settings").update({ last_report_at: nowIso() }).eq("id", true);
  return { records: 1, detail: summary };
}

/**
 * Daily site-wide rollup written to seo_intel_daily_snapshots so the dashboard can
 * compare today vs 7 / 30 days ago from recorded history instead of recomputing
 * estimates. Every field is either an actual provider number or a count of stored
 * rows; nothing is modelled or invented, and a metric with no data stays null.
 */
async function runDailySnapshot(ctx: Ctx) {
  const { sb } = ctx;
  // Paged reads: the Data API caps a single select at 1,000 rows, and a partial
  // read would silently understate every total on the dashboard.
  const fetchAll = async (table: string, cols: string) => {
    const out: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
      if (error) throw new Error(`${table} read failed: ${error.message}`);
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  };

  const [pageList, kwList, recs] = await Promise.all([
    fetchAll("seo_intel_pages", "clicks, impressions, avg_position, position_change, health_score, indexed_status, psi_perf_score, psi_lcp_ms"),
    fetchAll("seo_intel_keywords", "current_position, position_change, clicks, impressions"),
    fetchAll("seo_intel_recommendations", "status"),
  ]);
  const avg = (vals: number[]) =>
    vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
  const nums = (rows: any[], key: string) =>
    rows.map((r) => r[key]).filter((v: any) => v != null).map(Number);

  const ranked = kwList.filter((k: any) => k.current_position != null).map((k: any) => Number(k.current_position));
  const clicks = pageList.reduce((s: number, p: any) => s + (p.clicks ?? 0), 0);
  const impressions = pageList.reduce((s: number, p: any) => s + (p.impressions ?? 0), 0);
  const indexed = pageList.filter((p: any) => p.indexed_status && /index/i.test(p.indexed_status) && !/not/i.test(p.indexed_status)).length;

  const row = {
    captured_on: today(),
    clicks,
    impressions,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
    avg_position: avg(nums(pageList, "avg_position")),
    ranking_keywords: ranked.length || null,
    rank_1: ranked.filter((p) => p <= 1.5).length,
    rank_2: ranked.filter((p) => p > 1.5 && p <= 2.5).length,
    rank_3: ranked.filter((p) => p > 2.5 && p <= 3.5).length,
    top_5: ranked.filter((p) => p <= 5).length,
    top_10: ranked.filter((p) => p <= 10).length,
    top_20: ranked.filter((p) => p <= 20).length,
    gains: kwList.filter((k: any) => (k.position_change ?? 0) > 0).length,
    losses: kwList.filter((k: any) => (k.position_change ?? 0) < 0).length,
    indexed_pages: indexed,
    not_indexed_pages: pageList.filter((p: any) => p.indexed_status && !/index/i.test(p.indexed_status)).length,
    pages_tracked: pageList.length,
    avg_health: avg(nums(pageList, "health_score")),
    avg_psi_perf: avg(nums(pageList, "psi_perf_score")),
    avg_lcp_ms: avg(nums(pageList, "psi_lcp_ms")),
    open_recommendations: recs.filter((r: any) => ["new", "review"].includes(r.status)).length,
    applied_changes: recs.filter((r: any) => ["applied", "verified"].includes(r.status)).length,
    data_sources: {
      traffic: "gsc (actual)",
      positions: "gsc / semrush (actual)",
      onpage: "internal (calculated)",
      speed: "pagespeed (actual)",
    },
    coverage: {
      pages_with_performance: pageList.filter((p: any) => p.impressions != null).length,
      pages_with_speed: pageList.filter((p: any) => p.psi_perf_score != null).length,
      pages_with_index_state: pageList.filter((p: any) => !!p.indexed_status).length,
      keywords_with_position: ranked.length,
      keywords_total: kwList.length,
    },
  };

  const { error } = await sb.from("seo_intel_daily_snapshots").upsert(row, { onConflict: "captured_on" });
  if (error) throw new Error(`Snapshot write failed: ${error.message}`);
  return { records: 1, detail: `${clicks} clicks · ${ranked.length} ranking keywords · ${indexed} indexed pages` };
}

/* ─────────── autonomous research: find the keywords worth winning ─────────── */

/**
 * Keyword research. Two real sources, no invented numbers:
 *  1. Search Console — queries we already rank 4-20 for ("striking distance").
 *  2. Semrush phrase expansion for those seeds — related terms and questions we
 *     do not rank for yet, with provider volume / difficulty / CPC.
 * New keywords land in seo_intel_keywords (tracked) and, where no page targets
 * them, in seo_intel_content_gaps so the strategy layer can act on them.
 */
async function runKeywordDiscovery(ctx: Ctx) {
  const { sb, settings } = ctx;
  const locale = settings.semrush_database || "in";
  await ctx.beat("Reading Search Console query history", 5);

  const { data: striking } = await sb.from("seo_intel_keywords")
    .select("keyword, current_position, impressions, clicks, target_path, search_volume")
    .eq("locale", locale)
    .gte("current_position", 3.5).lte("current_position", 20.5)
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(40);

  const seeds = (striking ?? []).slice(0, 8).map((k: any) => k.keyword);
  if (!seeds.length) {
    return { skipped: "No Search Console query history yet — run the Search Console sync first.", records: 0 };
  }

  // 1. Striking-distance keywords become explicit, tracked opportunities.
  let promoted = 0;
  for (const k of striking ?? []) {
    const { error } = await sb.from("seo_intel_keywords").update({
      is_tracked: true,
      discovered_from: "gsc_striking_distance",
      discovery_source: "gsc",
      updated_at: nowIso(),
    }).eq("keyword", k.keyword).eq("locale", locale);
    if (!error) promoted++;
  }
  await ctx.beat(`${promoted} striking-distance keywords marked for attack`, 25);

  // 2. Semrush expansion around those seeds.
  let discovered = 0;
  let gapsAdded = 0;
  if (!semrushConfigured()) {
    return {
      records: promoted,
      detail: `${promoted} striking-distance keywords tracked (Search Console, actual). Semrush is not connected, so no expansion was possible.`,
    };
  }

  const existing = new Set<string>();
  const { data: known } = await sb.from("seo_intel_keywords").select("keyword").eq("locale", locale).limit(3000);
  for (const k of known ?? []) existing.add(String(k.keyword).toLowerCase());

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    await ctx.beat(`Expanding "${seed}" with Semrush`, 30 + Math.round((i / seeds.length) * 55), undefined, seed);
    let rows: any[] = [];
    try {
      rows = await semrushExpand(seed, locale, 30);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markSource(sb, "semrush", { configured: true, status: "error", last_error: msg, last_sync_at: nowIso() });
      return {
        skipped: `Semrush limit reached during expansion — discovery paused (${msg.slice(0, 120)})`,
        records: promoted + discovered,
      };
    }
    const fresh = rows
      .filter((r: any) => r?.keyword && !existing.has(String(r.keyword).toLowerCase()))
      .slice(0, 20);
    for (const r of fresh) {
      existing.add(String(r.keyword).toLowerCase());
      const { error } = await sb.from("seo_intel_keywords").upsert({
        keyword: r.keyword,
        locale,
        search_volume: r.volume ?? r.searchVolume ?? null,
        volume_source: "semrush",
        difficulty: r.difficulty ?? null,
        difficulty_source: r.difficulty != null ? "semrush" : null,
        cpc: r.cpc ?? null,
        competition: r.competition ?? null,
        intent: classifyIntent(r.keyword),
        is_tracked: true,
        discovered_from: seed,
        discovery_source: "semrush_expansion",
        first_seen_on: today(),
        last_checked_at: nowIso(),
        updated_at: nowIso(),
      }, { onConflict: "keyword,locale" });
      if (error) continue;
      discovered++;

      // No page of ours targets it → a real content gap, scored by provider volume.
      const volume = Number(r.volume ?? r.searchVolume ?? 0);
      if (volume >= 100) {
        const { error: gErr } = await sb.from("seo_intel_content_gaps").insert({
          keyword: r.keyword,
          gap_type: "missing_page",
          title: `No page targets "${r.keyword}"`,
          description: `Semrush reports ${volume.toLocaleString()} monthly searches for "${r.keyword}" (estimated, provider). Discovered while expanding our own ranking query "${seed}" (Search Console, actual). No page on mbacompass.in currently targets it.`,
          value_score: Math.min(100, Math.round(Math.log10(volume + 1) * 25)),
          priority: volume >= 1000 ? "high" : "medium",
          confidence: volume >= 1000 ? "high" : "medium",
          evidence: { seed, volume, volume_source: "semrush", seed_source: "gsc" },
          status: "open",
        });
        if (!gErr) gapsAdded++;
      }
    }
  }

  await ctx.beat("Storing research results", 95);
  await markSource(sb, "semrush", { configured: true, status: "connected", last_error: null, last_sync_at: nowIso() });
  if (discovered) {
    await notify(sb, {
      kind: "keyword_discovery", severity: "info",
      title: `${discovered} new keyword opportunity(ies) discovered`,
      body: `${promoted} striking-distance keywords tracked from Search Console, ${discovered} new keywords found via Semrush expansion, ${gapsAdded} content gaps opened.`,
    });
  }
  return {
    records: promoted + discovered,
    detail: `${promoted} striking-distance (Search Console, actual) · ${discovered} new keywords (Semrush, estimated) · ${gapsAdded} content gaps opened`,
  };
}

/* ─────────── competitor teardown: what the pages beating us actually do ─────────── */

async function runCompetitorDeep(ctx: Ctx) {
  const { sb } = ctx;
  if (!firecrawlConfigured()) {
    return { skipped: "Firecrawl is not connected — competitor pages cannot be read.", records: 0 };
  }
  const batch = Math.max(1, Math.min(4, Number(ctx.job.payload?.batch ?? 3)));
  const deadline = Date.now() + 110_000;

  const { data: comps } = await sb.from("seo_intel_competitors")
    .select("id, domain, keyword, their_url, their_position, our_position, our_path")
    .not("their_url", "is", null)
    .order("last_updated_on", { ascending: true, nullsFirst: true })
    .limit(batch);
  if (!comps?.length) return { skipped: "No competitor URLs stored yet — run the competitor scan first.", records: 0 };

  let done = 0;
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    if (Date.now() > deadline) break;
    await ctx.beat(`Reading ${c.domain} for "${c.keyword}"`, Math.round((i / comps.length) * 80) + 5, undefined, c.their_url);
    let html = "", md = "", title: string | null = null;
    try {
      const res = await firecrawlScrapeStrict(c.their_url, { formats: ["markdown", "rawHtml"], onlyMainContent: false, timeoutMs: 45_000 });
      const doc = res?.data ?? res ?? {};
      html = doc.rawHtml ?? doc.html ?? "";
      md = doc.markdown ?? "";
      title = doc.metadata?.title ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof FirecrawlError ? e.status : 0;
      if ([401, 402, 403, 429].includes(status)) {
        await markSource(sb, "firecrawl", { configured: true, status: "error", last_error: msg, last_tested_at: nowIso() });
        return { skipped: `Firecrawl unavailable — competitor teardown paused (${msg.slice(0, 140)})`, records: done };
      }
      continue;
    }

    const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
      .map((m) => ({ level: Number(m[1]), text: stripHtml(m[2]).trim().slice(0, 160) }))
      .filter((h) => h.text).slice(0, 60);
    const schemaTypes = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    const words = wordCount(md || stripHtml(html));
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? null;
    const faqCount = (md.match(/^#{2,3}\s.*\?/gm) ?? []).length;

    // Our own page, for a like-for-like comparison.
    const { data: ours } = await sb.from("seo_intel_pages")
      .select("path, title, meta_description, word_count, has_schema, primary_keyword, internal_links_out, avg_position, clicks, impressions")
      .eq("path", c.our_path ?? "").maybeSingle();

    await ctx.beat(`Comparing our page against ${c.domain}`, Math.round((i / comps.length) * 80) + 45, undefined, c.our_path);
    let why: string | null = null, what: string[] = [];
    const aiRes = await callAIGateway({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a precise SEO competitive analyst. Use only the supplied data. Output strict JSON." },
        {
          role: "user",
          content: `Keyword: "${c.keyword}" (locale India, MBA admissions).
COMPETITOR (crawled live just now): ${JSON.stringify({ domain: c.domain, url: c.their_url, position: c.their_position, title, metaDesc, words, faqCount, schemaTypes: [...new Set(schemaTypes)].slice(0, 12), headings: headings.slice(0, 40) })}
OUR PAGE (our CMS + Search Console actuals): ${JSON.stringify(ours ?? { note: "we have no page for this keyword" })}

Return STRICT JSON: {"why_outranking":"2-3 sentences citing only the numbers/structures above","what_to_change":["specific, implementable change", "..."],"content_gaps":["subtopic they cover and we do not", "..."]}`,
        },
      ],
      temperature: 0.2,
    }, { feature: "seo-intel-competitor-deep" });

    let gaps: string[] = [];
    if (aiRes.ok) {
      const payload = await aiRes.json();
      const parsed = parseAIJson<any>(payload?.choices?.[0]?.message?.content ?? "");
      why = parsed?.why_outranking ?? null;
      what = Array.isArray(parsed?.what_to_change) ? parsed.what_to_change.slice(0, 8) : [];
      gaps = Array.isArray(parsed?.content_gaps) ? parsed.content_gaps.slice(0, 10) : [];
    }

    await sb.from("seo_intel_competitors").update({
      title: title ? title.slice(0, 300) : null,
      meta_description: metaDesc ? metaDesc.slice(0, 400) : null,
      headings,
      schema_types: [...new Set(schemaTypes)].slice(0, 20),
      faq_count: faqCount,
      word_count: words,
      last_updated_on: today(),
      content_gaps: gaps,
      why_outranking: why,
      what_to_change: what.length ? what.map((w, n) => `${n + 1}. ${w}`).join("\n") : null,
      data_source: "firecrawl+openai",
      last_checked_at: nowIso(),
      updated_at: nowIso(),
    }).eq("id", c.id);

    // Turn each gap into a stored, reviewable content gap on our own page.
    for (const g of gaps.slice(0, 5)) {
      await sb.from("seo_intel_content_gaps").insert({
        path: c.our_path ?? null,
        keyword: c.keyword,
        gap_type: "competitor_coverage",
        title: String(g).slice(0, 200),
        description: `${c.domain} ranks #${c.their_position ?? "?"} for "${c.keyword}" and covers this; our page ${c.our_path ?? "(none)"} does not. Competitor page: ${words.toLocaleString()} words, ${faqCount} FAQ blocks, schema ${[...new Set(schemaTypes)].slice(0, 5).join(", ") || "none"} (Firecrawl, actual).`,
        competitor_domain: c.domain,
        competitor_url: c.their_url,
        value_score: 60,
        priority: (c.their_position ?? 99) <= 3 ? "high" : "medium",
        confidence: "medium",
        evidence: { competitor_words: words, our_words: ours?.word_count ?? null, competitor_position: c.their_position, our_position: c.our_position },
        status: "open",
      });
    }
    done++;
  }

  await markSource(sb, "firecrawl", { configured: true, status: "connected", last_error: null, last_sync_at: nowIso() });
  return { records: done, detail: `tore down ${done} competitor page(s) and stored what they do differently` };
}

/* ─────────── autonomous execution: apply the wins by itself ─────────── */

/**
 * Applies recommendations for real through the shared applier: titles, meta
 * descriptions, H1s, keyword injection, FAQ blocks, schema, answer-first
 * blocks and content expansion all become rows in page_seo_overrides.
 * Every application records a before/after snapshot and queues a page re-check
 * so the impact is measured, not claimed. Anything that needs a human stays a task.
 *
 * Payload: { limit?: number, ids?: string[] } — `ids` comes from a bulk
 * approval/apply in the admin UI.
 */
async function runAutoApply(ctx: Ctx) {
  const { sb, settings, job } = ctx;
  const explicitIds: string[] = Array.isArray(job.payload?.ids) ? job.payload.ids.map(String) : [];
  if (!settings.autonomous_mode && !explicitIds.length) {
    return { skipped: "Autonomous mode is off — changes wait for admin approval in the Approvals tab.", records: 0 };
  }

  const limit = Math.max(1, Math.min(60, Number(job.payload?.limit ?? 10)));
  let rows: any[] = [];
  if (explicitIds.length) {
    const { data } = await sb.from("seo_intel_recommendations").select("*")
      .in("id", explicitIds.slice(0, 200)).in("status", ["new", "review", "approved"]);
    rows = data ?? [];
  } else {
    const { data } = await sb.from("seo_intel_recommendations").select("*")
      .in("status", ["new", "review", "approved"])
      .not("path", "is", null)
      .order("priority").order("confidence", { ascending: false, nullsFirst: false })
      .limit(limit * 4);
    rows = (data ?? []).filter((r: any) => (r.confidence ?? 0.7) >= 0.6);
  }

  const eligible = rows.filter(canAutoApply).slice(0, limit);
  if (!eligible.length) {
    return { skipped: "No change is currently eligible for automatic application.", records: 0 };
  }

  let applied = 0; let human = 0;
  for (let i = 0; i < eligible.length; i++) {
    const rec = eligible[i];
    await ctx.beat(`Applying ${rec.change_type} on ${rec.path}`, Math.round((i / eligible.length) * 90) + 5, undefined, rec.path);
    const outcome = await applyRecommendation(sb, rec, { actor: null, actorLabel: explicitIds.length ? "engine (bulk apply)" : "engine (autonomous)" });
    if (outcome.ok) applied++;
    else if (outcome.needs_human) {
      human++;
      await sb.from("seo_intel_recommendations").update({ status: "approved", reviewed_at: nowIso() }).eq("id", rec.id);
    }
  }

  // Keep going while a bulk batch still has work left.
  const remaining = rows.filter(canAutoApply).length - eligible.length;
  if (explicitIds.length && remaining > 0) {
    await enqueue(sb, {
      job_type: "auto_apply", priority: 2, triggered_by: "admin",
      payload: { limit, ids: explicitIds.slice(eligible.length) },
      dedupe_key: `auto_apply:bulk:${Date.now()}`,
    }).catch(() => undefined);
  }

  if (applied) {
    await notify(sb, {
      kind: "auto_applied", severity: "info",
      title: `${applied} SEO change(s) written to pages`,
      body: "Each change recorded a before/after snapshot and queued a page re-check, so the score impact is measured.",
    });
  }
  return {
    records: applied,
    detail: `${applied} change(s) written to page data${human ? `, ${human} sent to the task board for a human` : ""}`,
  };
}

/* ─────────── keyword research: research → analyse → inject ─────────── */

/**
 * Real AI keyword research per page: best keywords, top-ranking terms, related
 * and long-tail variants plus competitor terms, each stored with the reason it
 * was selected. Semrush metrics are attached when the connector is available,
 * and the winning set becomes a keyword-injection recommendation for the page.
 */
async function runKeywordResearch(ctx: Ctx) {
  const { sb, settings, job } = ctx;
  const batch = Math.max(1, Math.min(40, Number(job.payload?.batch ?? 8)));
  const onePath = job.payload?.path ? String(job.payload.path) : null;

  let pages: any[] = [];
  if (onePath) {
    const { data } = await sb.from("seo_intel_pages")
      .select("path, page_type, entity_name, title, meta_description, primary_keyword, target_keywords, clicks, impressions, avg_position")
      .eq("path", onePath).limit(1);
    pages = data ?? [];
  } else {
    const { data } = await sb.from("seo_intel_pages")
      .select("path, page_type, entity_name, title, meta_description, primary_keyword, target_keywords, clicks, impressions, avg_position")
      .order("impressions", { ascending: false, nullsFirst: false })
      .limit(batch * 4);
    // Rotate: pages never researched, or researched longest ago, come first.
    const { data: seen } = await sb.from("seo_intel_keywords")
      .select("research_source_path, researched_at").not("researched_at", "is", null).limit(4000);
    const lastFor = new Map<string, number>();
    for (const k of seen ?? []) {
      const t = new Date(String(k.researched_at)).getTime();
      const p = String(k.research_source_path ?? "");
      if (!p) continue;
      if (!lastFor.has(p) || t > (lastFor.get(p) ?? 0)) lastFor.set(p, t);
    }
    pages = (data ?? []).sort((a: any, b: any) => (lastFor.get(a.path) ?? 0) - (lastFor.get(b.path) ?? 0)).slice(0, batch);
  }
  if (!pages.length) return { skipped: "No pages to research yet.", records: 0 };

  let stored = 0; let recs = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    await ctx.beat(`Researching keywords for ${p.path}`, Math.round((i / pages.length) * 90) + 5, undefined, p.path);

    const prompt = `You are an Indian MBA-admissions SEO keyword researcher for mbacompass.in.
Research the search demand for THIS page and select the keywords worth targeting.

Page: ${p.path}
Type: ${p.page_type ?? "unknown"}
Entity: ${p.entity_name ?? "—"}
Title: ${p.title ?? "—"}
Meta: ${p.meta_description ?? "—"}
Current primary keyword: ${p.primary_keyword ?? "none"}
Search Console actuals: clicks ${p.clicks ?? 0}, impressions ${p.impressions ?? 0}, average position ${p.avg_position ?? "—"}

Return STRICT JSON:
{"primary":{"keyword":"...","reason":"why this is the best primary for this page"},
 "keywords":[{"keyword":"...","kind":"best|top_ranking|related|long_tail|competitor","intent":"informational|commercial|transactional|navigational|comparison","reason":"one line: why it was selected for this page"}],
 "injection":{"recommended_change":"where and how to use these keywords on this page","problem":"what is missing today"}}

Rules: 12-18 keywords, Indian search behaviour, no invented volumes, no duplicates, keywords must be genuinely relevant to this exact page.`;

    let parsed: any = null;
    try {
      const res = await callAIGateway({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a precise SEO keyword researcher. Output strict JSON only. Never invent metrics." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }, { feature: "seo-intel-keyword-research" });
      if (res.ok) {
        const payload = await res.json();
        parsed = parseAIJson<any>(String(payload?.choices?.[0]?.message?.content ?? ""));
      }
    } catch (_) { /* keep going with the next page */ }
    if (!parsed) continue;

    const list: any[] = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    const primary = parsed.primary?.keyword ? String(parsed.primary.keyword) : null;
    const all = [
      ...(primary ? [{ keyword: primary, kind: "best", intent: null, reason: parsed.primary?.reason ?? "Selected as the page's primary keyword" }] : []),
      ...list,
    ].filter((k) => k?.keyword);

    // Attach real metrics where Semrush is connected; otherwise leave them null
    // rather than estimating.
    let metrics: Record<string, any> = {};
    if (semrushConfigured()) {
      try {
        const { rows } = await getKeywordMetrics(all.slice(0, 18).map((k) => String(k.keyword)), {
          locale: settings.semrush_database || "in", refresh: false, withGsc: true,
        }) as any;
        for (const r of rows ?? []) metrics[String(r.keyword).toLowerCase()] = r;
      } catch (_) { /* metrics stay unavailable */ }
    }

    for (const k of all.slice(0, 20)) {
      const kw = String(k.keyword).trim().toLowerCase();
      if (!kw) continue;
      const m = metrics[kw] ?? {};
      const { error } = await sb.from("seo_intel_keywords").upsert({
        keyword: kw,
        locale: settings.semrush_database || "in",
        target_path: p.path,
        keyword_kind: String(k.kind ?? "related"),
        intent: k.intent ?? classifyIntent(kw),
        research_reason: String(k.reason ?? "").slice(0, 600),
        research_source_path: p.path,
        researched_at: nowIso(),
        ai_model: "gpt-4.1-mini",
        discovered_from: p.path,
        discovery_source: "ai_research",
        search_volume: m.search_volume ?? null,
        volume_source: m.search_volume != null ? "semrush" : null,
        difficulty: m.difficulty ?? null,
        difficulty_source: m.difficulty != null ? "semrush" : null,
        cpc: m.cpc ?? null,
        last_checked_at: nowIso(),
      }, { onConflict: "keyword,locale" });
      if (!error) stored++;
    }

    // The research must end in an implementable change, not just a list.
    if (primary) {
      const candidate = {
        path: p.path,
        keyword: primary,
        category: "keywords",
        change_type: "keyword_injection",
        problem: String(parsed.injection?.problem ?? `The page does not clearly target "${primary}".`),
        evidence: `Researched ${all.length} keywords for this page; Search Console shows ${p.impressions ?? 0} impressions at average position ${p.avg_position ?? "—"}.`,
        why_it_matters: "Targeting the researched primary keyword and its long-tail variants in the title, intro and headings is what converts impressions into clicks.",
        recommended_change: String(parsed.injection?.recommended_change ?? `Use "${primary}" in the first sentence, one H2 and the meta description, and cover the researched long-tail variants in the body.`),
        confidence: 0.75,
        priority: (p.impressions ?? 0) > 500 ? "high" : "medium",
        data_source: "ai_research",
        auto_appliable: true,
      };
      const v = validateRecommendation(candidate as any);
      if (v.ok) {
        await upsertRecommendation(sb, candidate as any).catch(() => undefined);
        recs++;
      }
    }
  }

  await logActivity(sb, {
    event: "Keyword research completed",
    detail: `${stored} researched keyword(s) stored across ${pages.length} page(s), ${recs} injection recommendation(s) created`,
    level: "success", job_id: ctx.job.id, job_type: "keyword_research", records: stored,
  });
  return { records: stored, detail: `${stored} keyword(s) researched with reasons across ${pages.length} page(s)` };
}

/* ─────────── page re-check: measure the real impact of a fix ─────────── */

/**
 * Re-scores a page after a change was written to it and records the measured
 * before/after health and AEO score on the pending seo_intel_page_scores row.
 */
async function runPageRecheck(ctx: Ctx) {
  const { sb, job } = ctx;
  const path = String(job.payload?.path ?? "");
  if (!path) return { skipped: "No page given to re-check.", records: 0 };

  const { data: page } = await sb.from("seo_intel_pages")
    .select("path, title, meta_description, word_count, has_schema, internal_links_out, health_score, aeo_score, health_issues, indexed_status, primary_keyword, clicks, impressions, ctr, avg_position")

    .eq("path", path).maybeSingle();
  if (!page) return { skipped: `No stored page for ${path}.`, records: 0 };

  const slug = path.split("/").filter(Boolean).pop() ?? "";
  const { data: ov } = await sb.from("page_seo_overrides")
    .select("title, description, h1, keywords, long_tail_keywords, faq, json_ld, intro_html, body_html")
    .eq("slug", slug).maybeSingle();

  const title = ov?.title ?? page.title ?? "";
  const description = ov?.description ?? page.meta_description ?? "";
  const extraWords = wordCount(stripHtml(`${ov?.intro_html ?? ""} ${ov?.body_html ?? ""}`));
  const faqCount = Array.isArray(ov?.faq) ? ov!.faq.length : 0;
  const hasSchema = !!ov?.json_ld || !!page.has_schema;

  const health = scoreHealth({
    words: Number(page.word_count ?? 0) + extraWords,
    hasTitle: !!title,
    hasDescription: String(description).length > 80,
    hasKeyword: !!(ov?.keywords?.length || page.primary_keyword),
    schemaValid: hasSchema,
    faqCount,
    internalLinks: Number(page.internal_links_out ?? 0),
    duplicationScore: 0,
    entityCoverage: ov?.keywords?.length ? 75 : 45,
    clicks: Number(page.clicks ?? 0),
    impressions: Number(page.impressions ?? 0),
    ctr: Number(page.ctr ?? 0),
    position: page.avg_position ?? null,
    decayState: "stable",
  });


  const aeoText = `${ov?.intro_html ?? ""}${ov?.body_html ?? ""}${(ov?.faq ?? []) ? JSON.stringify(ov?.faq ?? []) : ""}`;
  const aeo = aeoText.trim()
    ? scoreAeoGeo(aeoText, { requireFaq: faqCount === 0 })
    : null;

  const aeoScore = aeo ? Math.max(Number(page.aeo_score ?? 0), aeo.score) : (page.aeo_score ?? null);

  await sb.from("seo_intel_pages").update({
    health_score: health.health_score,
    health_issues: health.issues,

    aeo_score: aeoScore,
    aeo_checked_at: nowIso(),
    last_analyzed_at: nowIso(),
  }).eq("path", path);

  const { data: pending } = await sb.from("seo_intel_page_scores")
    .select("id, health_before, aeo_before, issues_before")
    .eq("path", path).eq("status", "pending").order("created_at", { ascending: true }).limit(20);

  for (const row of pending ?? []) {
    await sb.from("seo_intel_page_scores").update({
      health_after: health.health_score,
      aeo_after: aeoScore,
      issues_after: Array.isArray(health.issues) ? health.issues.length : null,
      status: "measured",
      measured_at: nowIso(),
    }).eq("id", row.id);
  }

  await logActivity(sb, {
    event: "Page re-checked after a fix",
    detail: `${path} — health ${pending?.[0]?.health_before ?? "—"} → ${health.health_score}`,
    level: "success", job_id: ctx.job.id, job_type: "page_recheck", records: 1,
  });
  return { records: 1, detail: `${path} re-scored: health ${health.health_score}` };
}




const HANDLERS: Record<string, (ctx: Ctx) => Promise<{ records: number; skipped?: string; detail?: string }>> = {
  gsc_pages: runGscPages,
  gsc_queries: runGscQueries,
  crawl_pages: runCrawlPages,
  keyword_metrics: runKeywordMetrics,
  rank_track: runRankTrack,
  competitor_scan: runCompetitorScan,
  index_check: runIndexCheck,
  live_crawl: runLiveCrawl,
  speed_audit: runSpeedAudit,
  analyze: runAnalyze,
  verify: runVerify,
  report: runReport,
  daily_snapshot: runDailySnapshot,
  keyword_discovery: runKeywordDiscovery,
  competitor_deep: runCompetitorDeep,
  auto_apply: runAutoApply,
  keyword_research: runKeywordResearch,
  page_recheck: runPageRecheck,

};



// Advanced intelligence stages share one signature (sb, settings, payload).
for (const [type, fn] of Object.entries(ADVANCED_STAGES)) {
  HANDLERS[type] = (ctx: Ctx) => fn(ctx.sb, ctx.settings, ctx.job.payload ?? {});
}


/* ───────────────────────── entry point ───────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const sb = admin();
  const settings = await loadIntelSettings(sb);

  const isCron =
    (body?.cron_token && body.cron_token === settings.cron_token) ||
    (body?.cron_secret && body.cron_secret === Deno.env.get("CRON_SECRET"));
  if (!isCron) {
    const denied = await requireAdmin(req, cors);
    if (denied) return denied;
  }

  const depth = Number(body?.depth ?? 0);
  if (depth > MAX_DEPTH) return json({ status: "depth_budget_spent", depth });

  const gate = withinSchedule(settings);
  if (!gate.ok && !body?.force) {
    // The schedule gate only governs automatic work. A job an admin queued by
    // hand ("Run now") must still be drained, otherwise it sits in the queue
    // forever while the engine switch is off or outside the window.
    const { count: manualQueued } = await sb.from("seo_intel_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued").eq("triggered_by", "manual");
    if (!manualQueued) return json({ status: "idle", reason: gate.reason });
  }


  const { data: claimed, error: claimErr } = await sb.rpc("seo_intel_claim_job", { p_lease_seconds: LEASE_SECONDS });
  if (claimErr) return json({ error: claimErr.message }, 500);
  const job = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!job) return json({ status: "empty" });

  const handler = HANDLERS[job.job_type];
  const label = JOB_LABELS[job.job_type] ?? job.job_type;
  const startedAt = Date.now();

  const ctx: Ctx = {
    sb, settings, job,
    siteUrl: null,
    note: async (msg, records) => { await logActivity(sb, { event: label, detail: msg, job_id: job.id, job_type: job.job_type, records }); },
    beat: async (step, pct, detail, target) => { await beat(sb, job.id, { step, pct, detail, target }); },
  };

  try {
    if (!handler) throw new Error(`Unknown job type: ${job.job_type}`);
    await ctx.beat(`Starting ${label}`, 1);
    if (["gsc_pages", "gsc_queries", "index_check"].includes(job.job_type)) {
      await ctx.beat("Resolving the verified Search Console property", 3);
      ctx.siteUrl = await resolveSite(sb, settings);
    }
    const result = await handler(ctx);
    await sb.from("seo_intel_jobs").update({
      status: "done",
      records_processed: result.records ?? 0,
      finished_at: nowIso(),
      lease_until: null,
      error: result.skipped ?? null,
      progress: {
        step: result.skipped ? "Skipped" : "Completed",
        pct: 100,
        detail: result.skipped ?? result.detail ?? null,
        at: nowIso(),
        records: result.records ?? 0,
      },
    }).eq("id", job.id);

    await logActivity(sb, {
      event: label,
      detail: result.skipped ?? result.detail ?? `${result.records} record(s) processed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
      level: result.skipped ? "warn" : "success",
      job_id: job.id, job_type: job.job_type, records: result.records ?? 0,
      data_source: job.data_source,
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const status = (e as any).providerStatus as number | undefined;
    const park = status === 402 || status === 403 || /insufficient_quota|billing|credit/i.test(msg);
    const retryable = !park && (status === 429 || (status ?? 0) >= 500 || /timeout|fetch failed|network/i.test(msg));
    const nextRetry = job.retry_count + 1;
    const willRetry = retryable && nextRetry <= job.max_retries;

    await sb.from("seo_intel_jobs").update({
      status: park ? "parked" : willRetry ? "queued" : "failed",
      retry_count: nextRetry,
      error: msg.slice(0, 800),
      errors: [...(job.errors ?? []), { at: nowIso(), message: msg.slice(0, 400) }],
      scheduled_for: willRetry ? new Date(Date.now() + Math.min(nextRetry * 60_000, 300_000)).toISOString() : job.scheduled_for,
      lease_until: null,
      finished_at: willRetry ? null : nowIso(),
    }).eq("id", job.id);

    await logActivity(sb, {
      event: `${label} failed`, detail: msg.slice(0, 500),
      level: "error", job_id: job.id, job_type: job.job_type,
    });
    if (park) {
      await parkEngine(sb, `Provider blocked the request (${status ?? "quota"}): ${msg.slice(0, 200)}`);
      return json({ status: "parked", job: job.job_type, error: msg });
    }
  }

  // Re-kick only when work remains, after a cooldown.
  const { count: remaining } = await sb.from("seo_intel_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued").lte("scheduled_for", nowIso());
  if ((remaining ?? 0) > 0 && depth + 1 <= MAX_DEPTH) {
    await new Promise((r) => setTimeout(r, COOLDOWN_MS));
    await invokeFn("seo-intel-worker", { cron_token: settings.cron_token, depth: depth + 1, force: body?.force ?? false });
  }

  return json({ status: "ok", job: job.job_type, remaining: remaining ?? 0, depth });
});
