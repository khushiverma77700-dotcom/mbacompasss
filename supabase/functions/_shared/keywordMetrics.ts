// Single source of truth for REAL keyword metrics.
//
// Providers, in priority order per metric:
//   volume / cpc / competition / 12-month trend
//     1. DataForSEO (Google Ads Keyword Planner)  — when DATAFORSEO_LOGIN/PASSWORD are set
//     2. Semrush     (phrase_these, India DB)     — via the Lovable connector gateway
//   difficulty
//     1. Semrush Keyword Difficulty Index (Kd)
//     2. DataForSEO competition index scaled 0-100
//   actual performance (clicks / impressions / position)
//     Google Search Console data already ingested into public.gsc_query_metrics
//
// Every number carries a `source`. Nothing is ever invented here — when no
// provider has data the metric comes back null and the caller decides whether
// to fall back to a clearly-labelled AI estimate.
import { createClient } from "npm:@supabase/supabase-js@2";

const SEMRUSH_GATEWAY = "https://connector-gateway.lovable.dev/semrush";
const DFS_BASE = "https://api.dataforseo.com/v3";

/** How long a volume row stays fresh (Keyword Planner updates monthly). */
const VOLUME_TTL_DAYS = 30;
/** How long the GSC overlay stays fresh. */
const GSC_TTL_DAYS = 7;

export type MetricSource =
  | "dataforseo"
  | "semrush"
  | "gsc"
  | "cache"
  | "ai_estimate"
  | "none";

export interface KeywordMetric {
  keyword: string;
  locale: string;
  searchVolume: number | null;
  cpc: number | null;
  /** 0-1 paid competition index. */
  competition: number | null;
  /** 0-100 SEO difficulty. */
  difficulty: number | null;
  resultsCount: number | null;
  /** Relative monthly interest, oldest → newest (12 points) when available. */
  monthlyTrend: number[] | null;
  trendDirection: "up" | "stable" | "down" | null;
  /** Our own measured Search Console performance for this query. */
  gsc: { clicks: number; impressions: number; ctr: number; position: number } | null;
  volumeSource: MetricSource;
  difficultySource: MetricSource;
  fetchedAt: string | null;
  /** true when at least one number came from a real provider. */
  verified: boolean;
}

export interface ProviderHealth {
  dataforseo: { configured: boolean; ok: boolean | null; error?: string };
  semrush: { configured: boolean; ok: boolean | null; error?: string };
  gsc: { configured: boolean; rows: number };
  cacheHits: number;
  liveFetches: number;
}

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const norm = (k: string) => k.trim().toLowerCase().replace(/\s+/g, " ");
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function emptyMetric(keyword: string, locale: string): KeywordMetric {
  return {
    keyword,
    locale,
    searchVolume: null,
    cpc: null,
    competition: null,
    difficulty: null,
    resultsCount: null,
    monthlyTrend: null,
    trendDirection: null,
    gsc: null,
    volumeSource: "none",
    difficultySource: "none",
    fetchedAt: null,
    verified: false,
  };
}

function trendDirection(trend: number[] | null): "up" | "stable" | "down" | null {
  if (!trend || trend.length < 6) return null;
  const half = Math.floor(trend.length / 2);
  const older = trend.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const recent = trend.slice(half).reduce((a, b) => a + b, 0) / (trend.length - half);
  if (!older) return null;
  const delta = (recent - older) / older;
  if (delta > 0.15) return "up";
  if (delta < -0.15) return "down";
  return "stable";
}

// ───────────────────────── Semrush (gateway) ─────────────────────────

export function semrushConfigured() {
  return Boolean(Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("SEMRUSH_API_KEY"));
}

async function semrushGet(path: string, params: Record<string, string>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SEMRUSH_API_KEY = Deno.env.get("SEMRUSH_API_KEY");
  if (!LOVABLE_API_KEY || !SEMRUSH_API_KEY) throw new Error("Semrush is not connected");

  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${SEMRUSH_GATEWAY}${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": SEMRUSH_API_KEY,
      "Allow-Limit-Offset": "true",
    },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`semrush ${resp.status}: ${text.slice(0, 300)}`);
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`semrush returned non-JSON: ${text.slice(0, 200)}`);
  }
  if (json?.error) throw new Error(`semrush: ${String(json.error).slice(0, 200)}`);
  const cols: string[] = json?.data?.columnNames || [];
  const rows: string[][] = json?.data?.rows || [];
  return rows.map((r) => {
    const o: Record<string, string> = {};
    cols.forEach((c, i) => (o[c] = r[i]));
    return o;
  });
}

/** Batch volume/CPC/competition/trend/difficulty for up to 100 phrases. */
async function semrushBatch(keywords: string[], locale: string) {
  const out = new Map<string, Partial<KeywordMetric>>();
  for (let i = 0; i < keywords.length; i += 90) {
    const chunk = keywords.slice(i, i + 90);
    const rows = await semrushGet("/keywords/phrase_these", {
      phrase: chunk.join(";"),
      database: locale,
      export_columns: "Ph,Nq,Cp,Co,Nr,Td,Kd",
    });
    for (const r of rows) {
      const kw = norm(r["Keyword"] || "");
      if (!kw) continue;
      const trend = (r["Trends"] || "")
        .split(",")
        .map((v) => num(v))
        .filter((v): v is number => v !== null);
      out.set(kw, {
        searchVolume: num(r["Search Volume"]),
        cpc: num(r["CPC"]),
        competition: num(r["Competition"]),
        resultsCount: num(r["Number of Results"]),
        difficulty: num(r["Keyword Difficulty Index"]),
        monthlyTrend: trend.length ? trend : null,
      });
    }
  }
  return out;
}

/** Real related keywords + question keywords, with their own volumes. */
export async function semrushExpand(seed: string, locale = "in", limit = 40) {
  const results: { keyword: string; searchVolume: number | null; difficulty: number | null; kind: string }[] = [];
  const grab = async (path: string, kind: string) => {
    try {
      const rows = await semrushGet(path, {
        phrase: seed,
        database: locale,
        export_columns: "Ph,Nq,Kd",
        display_limit: String(limit),
      });
      for (const r of rows) {
        results.push({
          keyword: r["Keyword"],
          searchVolume: num(r["Search Volume"]),
          difficulty: num(r["Keyword Difficulty Index"]),
          kind,
        });
      }
    } catch (e) {
      console.warn(`[keywordMetrics] ${path} failed:`, e instanceof Error ? e.message : e);
    }
  };
  await grab("/keywords/phrase_related", "related");
  await grab("/keywords/phrase_questions", "question");
  return results;
}

/** Top-10 organic SERP owners for a keyword (who we must beat). */
export async function semrushSerp(keyword: string, locale = "in") {
  try {
    const rows = await semrushGet("/keywords/phrase_organic", {
      phrase: keyword,
      database: locale,
      export_columns: "Dn,Ur,Fk,Fp",
      display_limit: "10",
    });
    return rows.map((r, i) => ({
      position: i + 1,
      domain: r["Domain"],
      url: r["Url"],
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[keywordMetrics] serp failed:", msg);
    // A quota / plan limit is a real, actionable state — never hide it as "no results".
    if (/LIMIT EXCEEDED|quota|403/i.test(msg)) throw new Error(`Semrush quota: ${msg.slice(0, 160)}`);
    return [];
  }
}

/** Keywords a competitor ranks for that we do not (real gap data). */
export async function semrushCompetitorGap(ourDomain: string, competitor: string, locale = "in", limit = 25) {
  try {
    const rows = await semrushGet("/domains/domain_domains", {
      domains: `*|or|${competitor}|*|or|${ourDomain}`,
      database: locale,
      export_columns: "Ph,P0,P1,Nq,Cp,Kd",
      display_limit: String(limit),
    });
    return rows.map((r) => ({
      keyword: r["Keyword"],
      competitorPosition: num(r["P0"]),
      ourPosition: num(r["P1"]),
      searchVolume: num(r["Search Volume"]),
      cpc: num(r["CPC"]),
      difficulty: num(r["Keyword Difficulty Index"]),
    }));
  } catch (e) {
    console.warn("[keywordMetrics] gap failed:", e instanceof Error ? e.message : e);
    return [];
  }
}

// ───────────────────────── DataForSEO ─────────────────────────

export function dataForSeoConfigured() {
  return Boolean(Deno.env.get("DATAFORSEO_LOGIN") && Deno.env.get("DATAFORSEO_PASSWORD"));
}

const LOCATION_CODES: Record<string, number> = { in: 2356, us: 2840, uk: 2826, ae: 2784 };

/** Google Ads Keyword Planner volumes — the most authoritative source we have. */
async function dataForSeoBatch(keywords: string[], locale: string) {
  const login = Deno.env.get("DATAFORSEO_LOGIN")!;
  const password = Deno.env.get("DATAFORSEO_PASSWORD")!;
  const auth = btoa(`${login}:${password}`);
  const out = new Map<string, Partial<KeywordMetric>>();

  for (let i = 0; i < keywords.length; i += 100) {
    const chunk = keywords.slice(i, i + 100);
    const resp = await fetch(`${DFS_BASE}/keywords_data/google_ads/search_volume/live`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          keywords: chunk,
          location_code: LOCATION_CODES[locale] ?? LOCATION_CODES.in,
          language_code: "en",
          search_partners: false,
        },
      ]),
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`dataforseo ${resp.status}: ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    const items = json?.tasks?.[0]?.result || [];
    for (const it of items) {
      const kw = norm(it?.keyword || "");
      if (!kw) continue;
      const monthly = Array.isArray(it?.monthly_searches)
        ? [...it.monthly_searches]
            .sort((a: any, b: any) => (a.year - b.year) || (a.month - b.month))
            .map((m: any) => Number(m.search_volume) || 0)
        : null;
      out.set(kw, {
        searchVolume: num(it?.search_volume),
        cpc: num(it?.cpc),
        competition: num(it?.competition_index) !== null ? Number(it.competition_index) / 100 : num(it?.competition),
        monthlyTrend: monthly && monthly.length ? monthly : null,
      });
    }
  }
  return out;
}

// ───────────────────────── GSC overlay ─────────────────────────

async function gscOverlay(keywords: string[]) {
  const sb = admin();
  const out = new Map<string, KeywordMetric["gsc"]>();
  try {
    const { data } = await sb
      .from("gsc_query_metrics")
      .select("query,clicks,impressions,ctr,position")
      .in("query", keywords.map((k) => k))
      .limit(2000);
    for (const row of data || []) {
      const kw = norm(row.query || "");
      if (!kw) continue;
      const prev = out.get(kw);
      const next = {
        clicks: Number(row.clicks) || 0,
        impressions: Number(row.impressions) || 0,
        ctr: Number(row.ctr) || 0,
        position: Number(row.position) || 0,
      };
      // Keep the best-performing row when the query ranks on several paths.
      if (!prev || next.clicks > prev.clicks) out.set(kw, next);
    }
  } catch (e) {
    console.warn("[keywordMetrics] gsc overlay failed:", e instanceof Error ? e.message : e);
  }
  return out;
}

// ───────────────────────── Public API ─────────────────────────

export interface LookupOptions {
  locale?: string;
  /** Skip the cache and force live provider calls. */
  refresh?: boolean;
  /** Include our own Search Console performance. Default true. */
  withGsc?: boolean;
}

/**
 * Resolve real metrics for a list of keywords: cache → DataForSEO → Semrush,
 * plus a GSC overlay. Never throws for a provider failure; the affected
 * keywords simply come back unverified.
 */
export async function getKeywordMetrics(
  rawKeywords: string[],
  options: LookupOptions = {},
): Promise<{ metrics: KeywordMetric[]; health: ProviderHealth }> {
  const locale = (options.locale || "in").toLowerCase();
  const keywords = [...new Set(rawKeywords.map(norm).filter((k) => k.length > 1))].slice(0, 400);

  const health: ProviderHealth = {
    dataforseo: { configured: dataForSeoConfigured(), ok: null },
    semrush: { configured: semrushConfigured(), ok: null },
    gsc: { configured: true, rows: 0 },
    cacheHits: 0,
    liveFetches: 0,
  };

  const result = new Map<string, KeywordMetric>();
  for (const k of keywords) result.set(k, emptyMetric(k, locale));
  if (!keywords.length) return { metrics: [], health };

  const sb = admin();

  // 1. cache
  const stale = new Set(keywords);
  if (!options.refresh) {
    const cutoff = new Date(Date.now() - VOLUME_TTL_DAYS * 864e5).toISOString();
    try {
      const { data } = await sb
        .from("keyword_metrics_cache")
        .select("*")
        .eq("locale", locale)
        .in("keyword", keywords)
        .gte("fetched_at", cutoff);
      for (const row of data || []) {
        const kw = norm(row.keyword);
        if (!result.has(kw)) continue;
        result.set(kw, {
          ...emptyMetric(kw, locale),
          searchVolume: row.search_volume,
          cpc: row.cpc !== null ? Number(row.cpc) : null,
          competition: row.competition !== null ? Number(row.competition) : null,
          difficulty: row.difficulty !== null ? Number(row.difficulty) : null,
          resultsCount: row.results_count !== null ? Number(row.results_count) : null,
          monthlyTrend: Array.isArray(row.monthly_trend) ? row.monthly_trend : null,
          trendDirection: trendDirection(Array.isArray(row.monthly_trend) ? row.monthly_trend : null),
          gsc:
            row.gsc_impressions !== null && row.gsc_fetched_at &&
            Date.now() - new Date(row.gsc_fetched_at).getTime() < GSC_TTL_DAYS * 864e5
              ? {
                  clicks: row.gsc_clicks ?? 0,
                  impressions: row.gsc_impressions ?? 0,
                  ctr: row.gsc_ctr !== null ? Number(row.gsc_ctr) : 0,
                  position: row.gsc_position !== null ? Number(row.gsc_position) : 0,
                }
              : null,
          volumeSource: (row.volume_source as MetricSource) || "cache",
          difficultySource: (row.difficulty_source as MetricSource) || "none",
          fetchedAt: row.fetched_at,
          verified: row.search_volume !== null,
        });
        if (row.search_volume !== null) {
          stale.delete(kw);
          health.cacheHits++;
        }
      }
    } catch (e) {
      console.warn("[keywordMetrics] cache read failed:", e instanceof Error ? e.message : e);
    }
  }

  const toFetch = [...stale];

  // 2. DataForSEO (primary volume)
  if (toFetch.length && health.dataforseo.configured) {
    try {
      const dfs = await dataForSeoBatch(toFetch, locale);
      health.dataforseo.ok = true;
      for (const [kw, m] of dfs) {
        const cur = result.get(kw);
        if (!cur) continue;
        if (m.searchVolume !== null && m.searchVolume !== undefined) {
          Object.assign(cur, m, { volumeSource: "dataforseo" as MetricSource, verified: true });
          cur.trendDirection = trendDirection(cur.monthlyTrend);
        }
      }
      health.liveFetches += toFetch.length;
    } catch (e) {
      health.dataforseo.ok = false;
      health.dataforseo.error = e instanceof Error ? e.message : String(e);
      console.warn("[keywordMetrics] dataforseo failed:", health.dataforseo.error);
    }
  }

  // 3. Semrush — fills volume where DataForSEO had none, and always supplies difficulty
  if (toFetch.length && health.semrush.configured) {
    try {
      const sem = await semrushBatch(toFetch, locale);
      health.semrush.ok = true;
      for (const [kw, m] of sem) {
        const cur = result.get(kw);
        if (!cur) continue;
        if (cur.searchVolume === null && m.searchVolume !== null && m.searchVolume !== undefined) {
          cur.searchVolume = m.searchVolume;
          cur.cpc = m.cpc ?? cur.cpc;
          cur.competition = m.competition ?? cur.competition;
          cur.monthlyTrend = m.monthlyTrend ?? cur.monthlyTrend;
          cur.volumeSource = "semrush";
          cur.verified = true;
        }
        cur.resultsCount = cur.resultsCount ?? m.resultsCount ?? null;
        if (m.difficulty !== null && m.difficulty !== undefined) {
          cur.difficulty = m.difficulty;
          cur.difficultySource = "semrush";
        }
        cur.trendDirection = trendDirection(cur.monthlyTrend);
      }
      health.liveFetches += toFetch.length;
    } catch (e) {
      health.semrush.ok = false;
      health.semrush.error = e instanceof Error ? e.message : String(e);
      console.warn("[keywordMetrics] semrush failed:", health.semrush.error);
    }
  }

  // difficulty fallback from paid competition when no provider gave a KD
  for (const m of result.values()) {
    if (m.difficulty === null && m.competition !== null) {
      m.difficulty = Math.round(m.competition * 100);
      m.difficultySource = m.volumeSource === "none" ? "none" : m.volumeSource;
    }
  }

  // 4. GSC overlay (our measured truth)
  if (options.withGsc !== false) {
    const gsc = await gscOverlay(keywords);
    health.gsc.rows = gsc.size;
    for (const [kw, g] of gsc) {
      const cur = result.get(kw);
      if (cur && g) cur.gsc = g;
    }
  }

  // 5. persist
  const rows = [...result.values()]
    .filter((m) => m.verified || m.gsc)
    .map((m) => ({
      keyword: m.keyword,
      locale,
      search_volume: m.searchVolume,
      cpc: m.cpc,
      competition: m.competition,
      difficulty: m.difficulty,
      results_count: m.resultsCount,
      monthly_trend: m.monthlyTrend,
      gsc_clicks: m.gsc?.clicks ?? null,
      gsc_impressions: m.gsc?.impressions ?? null,
      gsc_ctr: m.gsc?.ctr ?? null,
      gsc_position: m.gsc?.position ?? null,
      volume_source: m.volumeSource,
      difficulty_source: m.difficultySource,
      fetched_at: new Date().toISOString(),
      gsc_fetched_at: m.gsc ? new Date().toISOString() : null,
    }));
  if (rows.length) {
    try {
      await sb.from("keyword_metrics_cache").upsert(rows, { onConflict: "keyword,locale" });
    } catch (e) {
      console.warn("[keywordMetrics] cache write failed:", e instanceof Error ? e.message : e);
    }
  }

  for (const m of result.values()) if (!m.fetchedAt) m.fetchedAt = new Date().toISOString();
  return { metrics: [...result.values()], health };
}

/**
 * Opportunity score 0-100: real demand, beatable difficulty, healthy trend and
 * a bonus when we already have impressions but sit off page one.
 */
export function opportunityScore(m: KeywordMetric): number {
  if (!m.verified && !m.gsc) return 0;
  const vol = m.searchVolume ?? 0;
  const demand = Math.min(45, Math.log10(vol + 1) * 11); // 1k ≈ 33, 10k ≈ 44
  const kd = m.difficulty ?? 50;
  const winnable = Math.max(0, 30 * (1 - kd / 100));
  const trend = m.trendDirection === "up" ? 8 : m.trendDirection === "down" ? -6 : 2;
  let striking = 0;
  if (m.gsc && m.gsc.position >= 4 && m.gsc.position <= 20) striking = 17;
  else if (m.gsc && m.gsc.impressions > 0) striking = 8;
  return Math.max(0, Math.min(100, Math.round(demand + winnable + trend + striking)));
}

/** Compact, prompt-safe fact block so the model can never invent numbers. */
export function metricsFactBlock(metrics: KeywordMetric[]): string {
  const lines = metrics
    .filter((m) => m.verified || m.gsc)
    .slice(0, 60)
    .map((m) => {
      const parts = [`"${m.keyword}"`];
      if (m.searchVolume !== null) parts.push(`volume=${m.searchVolume}/mo (${m.volumeSource})`);
      if (m.difficulty !== null) parts.push(`KD=${m.difficulty}`);
      if (m.cpc !== null) parts.push(`CPC=₹${m.cpc}`);
      if (m.trendDirection) parts.push(`trend=${m.trendDirection}`);
      if (m.gsc) parts.push(`our GSC: pos ${m.gsc.position.toFixed(1)}, ${m.gsc.impressions} impressions, ${m.gsc.clicks} clicks`);
      return `- ${parts.join(" | ")}`;
    });
  if (!lines.length) return "NO VERIFIED KEYWORD METRICS AVAILABLE — do not state any search volume figures.";
  return `VERIFIED KEYWORD METRICS (real provider data — treat as facts, never change or invent numbers):\n${lines.join("\n")}`;
}
