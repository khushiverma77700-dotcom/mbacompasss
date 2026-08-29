// seo-intel-worker — executes ONE SEO intelligence job per invocation.
//
// Bounded by design: claim one leased job → run it → mark done/failed →
// re-kick itself (with a cooldown and a depth budget) only when work remains.
// A 402/403 from any provider parks the whole engine instead of looping.

import {
  admin, cors, json, loadIntelSettings, withinSchedule, enqueue, invokeFn,
  logActivity, parkEngine, markSource, notify, JOB_LABELS, nowIso, today, dayOffset, SITE_URL,
} from "../_shared/seoIntel.ts";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import {
  gscConfigured, resolveGscSite, gscPageMetrics, gscQueryMetrics, gscIndexState,
  loadPages, scoreHealth, stripHtml, wordCount, classifyIntent, parseAIJson,
} from "../_shared/seoSignals.ts";
import { getKeywordMetrics, semrushSerp, semrushConfigured } from "../_shared/keywordMetrics.ts";
import { firecrawlScrapeStrict, firecrawlConfigured, FirecrawlError } from "../_shared/firecrawlGateway.ts";
import { psiAudit, psiConfigured, PsiError } from "../_shared/pagespeed.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { ADVANCED_STAGES, validateRecommendation, upsertRecommendation } from "../_shared/seoIntel2.ts";


const MAX_DEPTH = 25;
const LEASE_SECONDS = 170;
const COOLDOWN_MS = 1500;

type Ctx = {
  sb: any;
  settings: any;
  job: any;
  siteUrl: string | null;
  note: (msg: string, records?: number) => Promise<void>;
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
async function runCrawlPages(ctx: Ctx) {
  const { sb, job } = ctx;
  const cursor = Number(job.payload?.cursor ?? 0);
  const limit = Number(ctx.settings.max_pages_per_run ?? 25) * 6; // DB reads are cheap
  const all = await loadPages(sb);
  const slice = all.slice(cursor, cursor + limit);

  const { data: perf } = await sb.from("seo_intel_pages")
    .select("path, clicks, impressions, ctr, avg_position")
    .in("path", slice.map((p) => p.path).slice(0, 500));
  const perfMap = new Map((perf ?? []).map((p: any) => [p.path, p]));

  const rows = slice.map((p) => {
    const html = p.html ?? "";
    const text = p.text ?? "";
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
    return {
      path: p.path,
      page_type: p.page_type,
      entity_name: p.name,
      title: p.name,
      meta_description: stripHtml(text).slice(0, 300) || null,
      word_count: words,
      has_schema: hasSchema,
      internal_links_out: internalOut,
      health_score: health.health_score,
      health_issues: health.issues,
      primary_keyword: p.keyword,
      last_crawl_at: nowIso(),
      data_sources: { onpage: "internal", label: "calculated" },
      updated_at: nowIso(),
    };
  });
  if (rows.length) await upsertRows(sb, "seo_intel_pages", rows, "path");

  const next = cursor + limit;
  if (next < all.length) {
    await enqueue(sb, {
      job_type: "crawl_pages",
      payload: { cursor: next },
      priority: 3,
      dedupe_key: `crawl_pages:cursor:${next}`,
      triggered_by: "worker",
    }).catch(() => {});
  }
  return { records: rows.length, detail: `pages ${cursor}-${cursor + rows.length} of ${all.length}` };
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
  const batch = 8;
  const deadline = Date.now() + 90_000; // stay well inside the function timeout
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path")
    .order("indexed_checked_at", { ascending: true, nullsFirst: true })
    .range(0, batch - 1);
  let done = 0;
  for (const p of pages ?? []) {
    if (Date.now() > deadline) break;
    let state: string | null = null;
    try {
      state = await gscIndexState(siteUrl, `${SITE_URL}${p.path}`);
    } catch (_e) {
      state = null; // a single URL failing must not fail the whole stage
    }
    await sb.from("seo_intel_pages").update({
      indexed_status: state ?? "unknown",
      indexed_checked_at: nowIso(),
    }).eq("path", p.path);
    if (state && !/^Submitted and indexed|Indexed/i.test(state)) {
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
  }
  await markSource(sb, "gsc_url_inspection", { configured: true, status: "connected", last_sync_at: nowIso() });
  return { records: done, detail: `inspected ${done} URL(s) from cursor ${cursor}` };
}

/* ─────────── Firecrawl: what a crawler actually receives (live HTML) ─────────── */

async function runLiveCrawl(ctx: Ctx) {
  const { sb, job } = ctx;
  if (!firecrawlConfigured()) {
    await markSource(sb, "firecrawl", { configured: false, status: "not_connected", last_error: "Firecrawl connector not linked" });
    return { skipped: "Firecrawl is not connected.", records: 0 };
  }

  const batch = Math.max(1, Math.min(6, Number(job.payload?.batch ?? 4)));
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
  for (const p of pages) {
    if (Date.now() > deadline) break;
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

      await sb.from("seo_intel_pages").update({
        rendered_title: renderedTitle ? renderedTitle.slice(0, 300) : null,
        rendered_h1: renderedH1 ? stripHtml(renderedH1).slice(0, 300) : null,
        rendered_word_count: words,
        rendered_has_schema: hasSchema,
        rendered_links_out: linksOut,
        ssr_gap: ssrGap,
        live_crawl_at: nowIso(),
        live_crawl_error: null,
        updated_at: nowIso(),
      }).eq("path", p.path);
      done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof FirecrawlError ? e.status : 0;
      // Credits / policy / rate limits are engine-wide problems, not page problems.
      if (status === 402 || status === 403 || status === 429 || status === 401) {
        await markSource(sb, "firecrawl", { configured: true, status: "error", last_error: msg, last_tested_at: nowIso() });
        return { skipped: `Firecrawl unavailable — live crawling paused (${msg.slice(0, 140)})`, records: done };
      }
      await sb.from("seo_intel_pages").update({
        live_crawl_at: nowIso(), live_crawl_error: msg.slice(0, 300), updated_at: nowIso(),
      }).eq("path", p.path);
    }
  }

  await markSource(sb, "firecrawl", { configured: true, status: "connected", last_error: null, last_sync_at: nowIso() });
  return { records: done, detail: `live-crawled ${done} page(s), ${gaps} with a crawler-visibility gap` };
}

/* ─────────── PageSpeed Insights: real Core Web Vitals per page ─────────── */

async function runSpeedAudit(ctx: Ctx) {
  const { sb, job } = ctx;
  const strategy: "mobile" | "desktop" = job.payload?.strategy === "desktop" ? "desktop" : "mobile";
  const batch = Math.max(1, Math.min(3, Number(job.payload?.batch ?? 2))); // PSI is slow (~20-40s/URL)
  const deadline = Date.now() + 110_000;

  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path")
    .order("psi_checked_at", { ascending: true, nullsFirst: true })
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(batch);
  if (!pages?.length) return { skipped: "No pages to audit yet.", records: 0 };

  let done = 0;
  for (const p of pages) {
    if (Date.now() > deadline) break;
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
        await markSource(sb, "pagespeed", {
          configured: psiConfigured(), status: "error", last_error: msg, last_tested_at: nowIso(),
        });
        return {
          skipped: status === 429
            ? `PageSpeed daily quota exhausted — speed audits resume after the quota resets (${msg.slice(0, 120)})`
            : `PageSpeed API rejected the request — ${msg.slice(0, 160)}`,
          records: done,
        };
      }
      await ctx.note(`PageSpeed failed for ${p.path}: ${msg.slice(0, 160)}`);
    }
  }

  await markSource(sb, "pagespeed", {
    configured: psiConfigured(), status: "connected", last_error: null, last_sync_at: nowIso(),
  });
  return { records: done, detail: `audited ${done} page(s) on ${strategy}` };
}


/** AI analysis over the stored signals → concrete, evidence-backed recommendations. */
async function runAnalyze(ctx: Ctx) {
  const { sb } = ctx;
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path, page_type, title, meta_description, word_count, has_schema, internal_links_out, health_score, health_issues, clicks, impressions, ctr, avg_position, prev_avg_position, position_change, primary_keyword, indexed_status, rendered_word_count, rendered_has_schema, ssr_gap, psi_perf_score, psi_lcp_ms, psi_cls, psi_tbt_ms, psi_opportunities")
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(12);
  if (!pages?.length) return { skipped: "No page data collected yet.", records: 0 };

  const { data: comps } = await sb.from("seo_intel_competitors")
    .select("domain, keyword, their_position, our_position").limit(20);

  const prompt = `You are a senior technical SEO analyst for mbacompass.in (Indian MBA admissions).
Analyse the REAL data below and produce specific, implementable recommendations.

RULES:
- Only use the numbers given. Never invent traffic, volume or rankings.
- Each recommendation must name the exact problem, the evidence (quote the numbers given), why it matters, the concrete change, and a before/after value where a text change is proposed.
- Prefer changes that can be applied to title, meta description, headings, internal links, schema or content depth.
- confidence is 0-1. priority is one of high | medium | low.
- category is one of: technical, content, keywords, internal_links, schema, ctr, indexing, competitor.

PAGES (Search Console = actual; on-page = from our CMS; rendered_* / ssr_gap = what Firecrawl actually received from the live URL; psi_* = real Google PageSpeed/Lighthouse mobile measurements, lcp/tbt in ms):
${JSON.stringify(pages, null, 1)}

Interpretation rules for the extra signals:
- ssr_gap true, or rendered_word_count far below word_count, means crawlers do not see the content — treat as a technical/indexing blocker with the highest priority.
- rendered_has_schema false while has_schema true means schema is injected client-side only.
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
  for (const r of recs.slice(0, 25)) {
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
  if (inserted) {
    await notify(sb, {
      kind: "recommendations", severity: "info",
      title: `${inserted} new SEO recommendation(s) ready`,
      body: "Open the Recommendations tab to review, approve or reject them.",
    });
  }
  return {
    records: inserted,
    detail: `${inserted} new, ${updated} refreshed, ${suppressed} suppressed for weak evidence`,
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
  if (!gate.ok && !body?.force) return json({ status: "idle", reason: gate.reason });

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
  };

  try {
    if (!handler) throw new Error(`Unknown job type: ${job.job_type}`);
    if (["gsc_pages", "gsc_queries", "index_check"].includes(job.job_type)) {
      ctx.siteUrl = await resolveSite(sb, settings);
    }
    const result = await handler(ctx);
    await sb.from("seo_intel_jobs").update({
      status: "done",
      records_processed: result.records ?? 0,
      finished_at: nowIso(),
      lease_until: null,
      error: result.skipped ?? null,
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
