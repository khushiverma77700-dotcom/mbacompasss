// Advanced SEO intelligence layer (Phase 2) for the AI SEO Intelligence Center.
//
// Every engine here follows one rule: REAL DATA > AI ASSUMPTION.
// When the stored evidence is too thin, the engine writes an explicit
// "insufficient data" verdict instead of inventing a number.

import { nowIso, today, dayOffset, SITE_URL } from "./seoIntel.ts";
import {
  classifyIntent, tokenize, jaccard, clusterKeyFor, stripHtml, wordCount, parseAIJson,
} from "./seoSignals.ts";
import { semrushSerp, semrushConfigured } from "./keywordMetrics.ts";
import { callAIGateway } from "./aiGateway.ts";

export type Confidence = "high" | "medium" | "low" | "insufficient";

export interface StageResult { records: number; skipped?: string; detail?: string }

/* ───────────────────── generic helpers ───────────────────── */

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const round = (n: number | null | undefined, d = 2) =>
  n == null || !isFinite(n) ? null : Number(n.toFixed(d));

export function stdev(xs: number[]): number | null {
  if (xs.length < 3) return null;
  const m = avg(xs)!;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Confidence from how many independent, agreeing sources back a value. */
export function confidenceFrom(sourceCount: number, agree: boolean, sampleDays: number): Confidence {
  if (sourceCount === 0) return "insufficient";
  if (sourceCount >= 2 && agree && sampleDays >= 21) return "high";
  if (sourceCount >= 2 && sampleDays >= 7) return "medium";
  if (sourceCount === 1 && sampleDays >= 14) return "medium";
  return "low";
}

async function upsert(sb: any, table: string, rows: any[], onConflict?: string) {
  if (!rows.length) return 0;
  for (let i = 0; i < rows.length; i += 300) {
    const part = rows.slice(i, i + 300);
    const q = onConflict
      ? sb.from(table).upsert(part, { onConflict })
      : sb.from(table).insert(part);
    const { error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return rows.length;
}

const localeOf = (s: any) => s?.semrush_database || "in";

/* ───────────────────── 1+2. multi-source demand ───────────────────── */

/** Best-effort Google Trends interest signal. Returns null when unavailable — never guessed. */
export async function googleTrends(keyword: string, geo = "IN"): Promise<{ direction: string; points: number[] } | null> {
  try {
    const req = {
      comparisonItem: [{ keyword, geo, time: "today 12-m" }],
      category: 0,
      property: "",
    };
    const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`;
    const ex = await fetch(exploreUrl, { signal: AbortSignal.timeout(12_000) });
    if (!ex.ok) return null;
    const exJson = JSON.parse((await ex.text()).replace(/^\)\]\}',?\n?/, ""));
    const widget = (exJson?.widgets ?? []).find((w: any) => w.id === "TIMESERIES");
    if (!widget) return null;
    const tsUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`;
    const ts = await fetch(tsUrl, { signal: AbortSignal.timeout(12_000) });
    if (!ts.ok) return null;
    const tsJson = JSON.parse((await ts.text()).replace(/^\)\]\}',?\n?/, ""));
    const points: number[] = (tsJson?.default?.timelineData ?? [])
      .map((p: any) => Number(p?.value?.[0] ?? 0));
    if (points.length < 6) return null;
    const recent = avg(points.slice(-3))!;
    const before = avg(points.slice(-9, -3)) ?? recent;
    const direction = recent > before * 1.15 ? "rising" : recent < before * 0.85 ? "falling" : "flat";
    return { direction, points };
  } catch (_) {
    return null;
  }
}

/**
 * Combines every available source per keyword and resolves ONE usable metric with
 * an explicit confidence. Sources are never averaged blindly: provider volume is
 * kept as the volume estimate, Search Console owns observed demand movement.
 */
export async function runDemandModel(sb: any, settings: any, payload: any = {}): Promise<StageResult> {
  const locale = localeOf(settings);
  const limit = Math.max(5, Math.min(60, Number(payload.limit ?? 30)));
  const useTrends = payload.trends !== false;

  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, search_volume, volume_source, monthly_trend, impressions, clicks, current_position, competition, difficulty")
    .eq("locale", locale).eq("is_tracked", true)
    .order("impressions", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (!kws?.length) return { skipped: "No tracked keywords yet — run the Search Console sync first.", records: 0 };

  const demandRows: any[] = [];
  const sourceRows: any[] = [];
  let emerging = 0;

  for (const k of kws) {
    // Observed demand from our own Search Console history (actual).
    const { data: hist } = await sb.from("seo_intel_rank_history")
      .select("captured_on, impressions, clicks, position")
      .eq("keyword", k.keyword).eq("locale", locale)
      .order("captured_on", { ascending: false }).limit(90);
    const series = (hist ?? []).filter((h: any) => h.impressions != null);
    const last30 = series.slice(0, 30).map((h: any) => Number(h.impressions));
    const prev30 = series.slice(30, 60).map((h: any) => Number(h.impressions));
    const cur = avg(last30);
    const prev = avg(prev30);
    const imprChange = cur != null && prev != null && prev > 0 ? round(((cur - prev) / prev) * 100, 1) : null;

    // Acceleration: last 7 days vs the 30-day mean (second derivative proxy).
    const last7 = avg(series.slice(0, 7).map((h: any) => Number(h.impressions)));
    const accel = last7 != null && cur != null && cur > 0 ? round(((last7 - cur) / cur) * 100, 1) : null;

    const sources: any[] = [];
    if (k.search_volume != null) {
      sources.push({ source: k.volume_source ?? "semrush", metric: "volume", value: k.search_volume, label: "estimated" });
      sourceRows.push({ keyword: k.keyword, locale, metric: "volume", source: k.volume_source ?? "semrush", value: k.search_volume, label: "estimated", confidence: "medium" });
    }
    if (cur != null) {
      sources.push({ source: "gsc", metric: "impressions_30d_avg", value: round(cur, 1), label: "actual" });
      sourceRows.push({ keyword: k.keyword, locale, metric: "impressions", source: "gsc", value: round(cur, 1), label: "actual", confidence: "high" });
    }

    let trendDir: string | null = null;
    if (useTrends) {
      const t = await googleTrends(k.keyword);
      if (t) {
        trendDir = t.direction;
        sources.push({ source: "google_trends", metric: "interest_direction", value_text: t.direction, label: "actual" });
        sourceRows.push({ keyword: k.keyword, locale, metric: "trend", source: "google_trends", value_text: t.direction, label: "actual", confidence: "medium", raw: { points: t.points.slice(-12) } });
      }
    }
    // Provider 12-month trend as a fallback direction signal.
    const mt = Array.isArray(k.monthly_trend) ? k.monthly_trend.map((p: any) => Number(p?.volume ?? p ?? 0)) : [];
    let providerDir: string | null = null;
    if (mt.length >= 6) {
      const r = avg(mt.slice(-3))!, b = avg(mt.slice(-9, -3)) ?? r;
      providerDir = r > b * 1.15 ? "rising" : r < b * 0.85 ? "falling" : "flat";
      sources.push({ source: "semrush", metric: "12m_trend", value_text: providerDir, label: "estimated" });
    }

    // Resolve direction: observed data wins over estimates; disagreement is recorded.
    const observedDir = imprChange == null ? null : imprChange > 15 ? "rising" : imprChange < -15 ? "falling" : "flat";
    const candidates = [observedDir, trendDir, providerDir].filter(Boolean) as string[];
    const finalDir = observedDir ?? trendDir ?? providerDir ?? "unknown";
    const agree = candidates.length > 1 && new Set(candidates).size === 1;
    const discrepancy = candidates.length > 1 && !agree
      ? {
          note: "Sources disagree on demand direction. Search Console (observed) is used as the final signal; provider/Trends direction is kept as context.",
          observed: observedDir, trends: trendDir, provider: providerDir,
        }
      : null;

    const conf = confidenceFrom(candidates.length, agree || candidates.length === 1, series.length);
    const isEmerging = (accel != null && accel >= 25 && (imprChange ?? 0) > 0) || (finalDir === "rising" && (imprChange ?? 0) >= 30);
    if (isEmerging) emerging++;

    const verdict = k.search_volume == null && cur == null
      ? "Insufficient data to determine search demand for this keyword."
      : [
          k.search_volume != null ? `Provider estimate ${k.search_volume}/month (${k.volume_source ?? "semrush"}, estimated).` : "No provider volume available.",
          cur != null ? `Search Console shows ${round(cur, 1)} average daily impressions over 30 days${imprChange != null ? ` (${imprChange > 0 ? "+" : ""}${imprChange}% vs the previous 30 days)` : ""}.` : "No Search Console impressions recorded yet.",
          trendDir ? `Google Trends interest is ${trendDir}.` : "",
          isEmerging ? "Demand is accelerating — flagged as an emerging opportunity." : "",
        ].filter(Boolean).join(" ");

    demandRows.push({
      keyword: k.keyword, locale,
      final_volume: k.search_volume ?? null,
      final_volume_source: k.search_volume != null ? (k.volume_source ?? "semrush") : null,
      volume_confidence: k.search_volume == null ? "insufficient" : conf,
      sources, discrepancy,
      trend_direction: finalDir,
      acceleration_30d: accel,
      impressions_change_pct: imprChange,
      seasonality: mt.length >= 12 ? { monthly: mt.slice(-12), source: "semrush" } : null,
      historical: { days_of_history: series.length, avg_impressions_30d: round(cur, 1), avg_impressions_prev_30d: round(prev, 1) },
      emerging: isEmerging,
      verdict,
      evidence: { sample_days: series.length, position: k.current_position, clicks: k.clicks },
      computed_at: nowIso(),
    });
  }

  await upsert(sb, "seo_intel_demand", demandRows, "keyword,locale");
  await upsert(sb, "seo_intel_kw_sources", sourceRows);
  return { records: demandRows.length, detail: `${demandRows.length} keywords modelled, ${emerging} flagged as emerging demand` };
}

/* ───────────────────── 3. intent intelligence ───────────────────── */

const DOMAIN_INTENTS: Array<[RegExp, string]> = [
  [/\badmission|apply|application|form|deadline|eligibility\b/i, "admission"],
  [/\bcollege|institute|campus|iim|iift|xlri\b/i, "college_specific"],
  [/\bmba|pgdm|course|program|specialis|specializ\b/i, "course_specific"],
  [/\bcat|xat|nmat|snap|cmat|mat|gmat|exam|mock|syllabus|pattern\b/i, "exam_specific"],
  [/\bin\s+(delhi|mumbai|bangalore|pune|hyderabad|chennai|kolkata|india)\b|near me/i, "location_specific"],
];

export function domainIntent(keyword: string): string {
  for (const [re, val] of DOMAIN_INTENTS) if (re.test(keyword)) return val;
  return classifyIntent(keyword);
}

export async function runIntentScan(sb: any, settings: any, payload: any = {}): Promise<StageResult> {
  const locale = localeOf(settings);
  const limit = Math.max(10, Math.min(300, Number(payload.limit ?? 150)));
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, intent, target_path")
    .eq("locale", locale).eq("is_tracked", true)
    .order("impressions", { ascending: false, nullsFirst: false }).limit(limit);
  if (!kws?.length) return { skipped: "No tracked keywords yet.", records: 0 };

  const { data: prevRows } = await sb.from("seo_intel_intent").select("keyword, intent, serp_intent").eq("locale", locale);
  const prevMap = new Map((prevRows ?? []).map((r: any) => [r.keyword, r]));

  const { data: serps } = await sb.from("seo_intel_serp")
    .select("keyword, top_results, captured_on").eq("locale", locale)
    .order("captured_on", { ascending: false }).limit(400);
  const serpMap = new Map<string, any>();
  for (const s of serps ?? []) if (!serpMap.has(s.keyword)) serpMap.set(s.keyword, s);

  const rows = (kws as any[]).map((k) => {
    const base = domainIntent(k.keyword);
    const secondary = [classifyIntent(k.keyword)].filter((x) => x !== base);
    const serp = serpMap.get(k.keyword);
    let serpIntent: string | null = null;
    if (serp?.top_results?.length) {
      const urls: string[] = serp.top_results.map((r: any) => String(r.url ?? ""));
      const admission = urls.filter((u) => /admission|apply|application/i.test(u)).length;
      const blog = urls.filter((u) => /blog|article|guide|news/i.test(u)).length;
      const compare = urls.filter((u) => /vs|compare|best|top/i.test(u)).length;
      serpIntent = admission >= 3 ? "admission" : compare >= 4 ? "comparison" : blog >= 4 ? "informational" : "mixed";
    }
    const prev = prevMap.get(k.keyword);
    const shift = !!(prev?.serp_intent && serpIntent && prev.serp_intent !== serpIntent && serpIntent !== "mixed");
    return {
      keyword: k.keyword, locale,
      intent: base,
      secondary_intents: secondary,
      intent_confidence: serpIntent ? (serpIntent === base ? "high" : "medium") : "low",
      serp_intent: serpIntent,
      previous_intent: prev?.serp_intent ?? null,
      shift_detected: shift,
      shift_evidence: shift
        ? { note: `Google's results moved from ${prev.serp_intent} to ${serpIntent} pages for this query.`, source: "serp_snapshot" }
        : null,
      recommended_target_path: k.target_path ?? null,
      computed_at: nowIso(),
    };
  });
  await upsert(sb, "seo_intel_intent", rows, "keyword,locale");
  const shifts = rows.filter((r) => r.shift_detected).length;
  return { records: rows.length, detail: `${rows.length} keywords classified, ${shifts} search-intent shift(s) detected` };
}

/* ───────────────────── 4. SERP intelligence ───────────────────── */

export async function runSerpIntel(sb: any, settings: any, payload: any = {}): Promise<StageResult> {
  if (!semrushConfigured()) return { skipped: "Semrush is not connected — SERP snapshots unavailable.", records: 0 };
  const locale = localeOf(settings);
  const limit = Math.max(1, Math.min(15, Number(payload.limit ?? 8)));
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, current_position, target_path")
    .eq("locale", locale).eq("is_tracked", true)
    .order("impressions", { ascending: false, nullsFirst: false }).limit(limit);
  if (!kws?.length) return { skipped: "No tracked keywords yet.", records: 0 };

  let stored = 0;
  for (const k of kws as any[]) {
    let serp: any[];
    try {
      serp = await semrushSerp(k.keyword, locale);
    } catch (e) {
      return { skipped: `Semrush SERP lookup unavailable — ${(e as Error).message.slice(0, 140)}`, records: stored };
    }
    const results = serp.slice(0, 10).map((s: any) => ({ position: s.position, domain: s.domain, url: s.url }));
    const urls = results.map((r) => String(r.url ?? ""));
    const features = {
      // Only what is actually detectable from the returned result set.
      forum_or_discussion: urls.some((u) => /quora|reddit|pagalguy|forum/i.test(u)),
      video: urls.some((u) => /youtube\.com|vimeo/i.test(u)),
      news: urls.some((u) => /news|timesofindia|hindustantimes|economictimes/i.test(u)),
      aggregator_listicles: urls.filter((u) => /top-|best-|list/i.test(u)).length,
      official_college_sites: urls.filter((u) => /\.ac\.in|\.edu/i.test(u)).length,
      detected_from: "semrush_organic_results",
      not_detectable: ["featured_snippet", "people_also_ask", "ai_overview", "image_pack", "local_pack"],
    };
    const rewarded =
      features.aggregator_listicles >= 4 ? "ranked listicle / comparison pages"
      : features.official_college_sites >= 4 ? "official institution pages"
      : features.forum_or_discussion ? "discussion-style answers"
      : "in-depth informational guides";
    const ourIdx = results.findIndex((r) => /mbacompass\.in/i.test(String(r.domain ?? "")));
    await upsert(sb, "seo_intel_serp", [{
      keyword: k.keyword, locale, captured_on: today(),
      features, top_results: results,
      our_position: ourIdx >= 0 ? results[ourIdx].position : (k.current_position ?? null),
      our_url: ourIdx >= 0 ? results[ourIdx].url : (k.target_path ? `${SITE_URL}${k.target_path}` : null),
      rewarded_format: rewarded,
      alignment: {
        we_rank_in_top_10: ourIdx >= 0,
        our_page: k.target_path ?? null,
        note: ourIdx >= 0
          ? `We appear at position ${results[ourIdx].position} in this SERP.`
          : "We are not in the top 10 for this query in the provider's result set.",
      },
      data_source: "semrush",
    }], "keyword,locale,captured_on");
    stored++;
  }
  return { records: stored, detail: `${stored} SERP snapshot(s) captured` };
}

/* ───────────────────── 5. volatility ───────────────────── */

export async function runVolatility(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const { data: hist } = await sb.from("seo_intel_rank_history")
    .select("keyword, captured_on, position, path")
    .eq("locale", locale)
    .gte("captured_on", dayOffset(10))
    .order("captured_on", { ascending: false })
    .limit(6000);
  if (!hist?.length) return { skipped: "No rank history yet — volatility needs at least two days of snapshots.", records: 0 };

  const byKw = new Map<string, any[]>();
  for (const h of hist) {
    if (h.position == null) continue;
    const arr = byKw.get(h.keyword) ?? [];
    arr.push(h);
    byKw.set(h.keyword, arr);
  }
  const moves: Array<{ keyword: string; delta: number; path: string | null }> = [];
  for (const [kw, arr] of byKw) {
    if (arr.length < 2) continue;
    const latest = arr[0];
    const before = arr.find((a) => a.captured_on < latest.captured_on);
    if (!before) continue;
    const delta = Number(before.position) - Number(latest.position);
    if (Math.abs(delta) >= 3) moves.push({ keyword: kw, delta: round(delta, 2)!, path: latest.path ?? null });
  }
  const tracked = byKw.size;
  if (tracked < 5) return { skipped: "Too few tracked keywords with history to judge volatility.", records: 0 };

  const share = moves.length / tracked;
  const avgAbs = round(avg(moves.map((m) => Math.abs(m.delta))) ?? 0, 2);
  const pathCounts = new Map<string, number>();
  for (const m of moves) if (m.path) pathCounts.set(m.path, (pathCounts.get(m.path) ?? 0) + 1);
  const topPath = [...pathCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  let classification = "normal";
  let confidence: Confidence = "low";
  if (share >= 0.4 && moves.length >= 15) { classification = "serp_wide"; confidence = "medium"; }
  else if (topPath && topPath[1] >= Math.max(4, moves.length * 0.5)) { classification = "site_specific"; confidence = "medium"; }
  else if (moves.length >= 5) { classification = "keyword_specific"; confidence = "medium"; }
  if (share >= 0.7 && moves.length >= 25) { classification = "possible_algo"; confidence = "low"; }

  const row = {
    detected_on: today(),
    window_hours: 48,
    scope: classification === "site_specific" ? "site" : "keyword",
    path: classification === "site_specific" ? topPath?.[0] ?? null : null,
    keywords_moved: moves.length,
    keywords_tracked: tracked,
    avg_abs_change: avgAbs,
    classification,
    confidence,
    evidence: {
      share_of_tracked_keywords: round(share * 100, 1),
      biggest_movers: moves.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 12),
      concentrated_on_path: topPath ? { path: topPath[0], keywords: topPath[1] } : null,
      note: classification === "possible_algo"
        ? "A very large share of tracked keywords moved together. This is consistent with — but not proof of — an algorithm update."
        : "Classification is based only on our own tracked-keyword movement; no third-party volatility index is connected.",
    },
    created_at: nowIso(),
  };
  await upsert(sb, "seo_intel_volatility", [row]);
  return { records: 1, detail: `${moves.length}/${tracked} keywords moved ≥3 positions — classified as ${classification} (${confidence} confidence)` };
}

/* ───────────────────── 6. forecasting ───────────────────── */

export async function runForecast(sb: any, settings: any, payload: any = {}): Promise<StageResult> {
  const locale = localeOf(settings);
  const limit = Math.max(10, Math.min(200, Number(payload.limit ?? 80)));
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, current_position, target_path, competition, difficulty, impressions, ctr")
    .eq("locale", locale).eq("is_tracked", true)
    .not("current_position", "is", null)
    .order("impressions", { ascending: false, nullsFirst: false }).limit(limit);
  if (!kws?.length) return { skipped: "No ranked keywords to forecast yet.", records: 0 };

  const { data: demand } = await sb.from("seo_intel_demand").select("keyword, trend_direction, volume_confidence").eq("locale", locale);
  const demandMap = new Map((demand ?? []).map((d: any) => [d.keyword, d]));

  const rows: any[] = [];
  for (const k of kws as any[]) {
    const { data: hist } = await sb.from("seo_intel_rank_history")
      .select("captured_on, position").eq("keyword", k.keyword).eq("locale", locale)
      .not("position", "is", null)
      .order("captured_on", { ascending: false }).limit(45);
    const series = (hist ?? []).map((h: any) => Number(h.position));
    if (series.length < 5) {
      rows.push({
        keyword: k.keyword, locale, path: k.target_path, current_position: k.current_position,
        forecast_direction: "insufficient_data", confidence: "insufficient",
        factors: { reason: `Only ${series.length} day(s) of ranking history — at least 5 are needed for a forecast.` },
        computed_at: nowIso(),
      });
      continue;
    }
    const recent = avg(series.slice(0, 7))!;
    const older = avg(series.slice(7, 30)) ?? recent;
    const momentum = round(older - recent, 2); // positive = improving (lower position number)
    const d = demandMap.get(k.keyword);
    const comp = k.competition ?? (k.difficulty != null ? Number(k.difficulty) / 100 : null);

    let direction = "stable";
    if ((momentum ?? 0) > 0.7) direction = "improving";
    else if ((momentum ?? 0) < -0.7) direction = "declining";

    const distance = k.current_position != null ? Number(k.current_position) - 10 : null;
    const nearThreshold = distance != null && distance > 0 && distance <= 6;
    let probability: number | null = null;
    if (direction === "improving" && nearThreshold) probability = Math.min(0.75, 0.35 + (6 - distance) * 0.06 - (comp ?? 0.5) * 0.15);
    else if (direction === "improving") probability = 0.3;
    else if (direction === "declining") probability = 0.15;
    else probability = nearThreshold ? 0.25 : 0.12;

    rows.push({
      keyword: k.keyword, locale, path: k.target_path,
      current_position: k.current_position,
      momentum_30d: momentum,
      demand_direction: d?.trend_direction ?? null,
      competition: comp,
      forecast_direction: direction,
      target_threshold: nearThreshold ? "top_10" : k.current_position <= 10 ? "top_3" : "top_20",
      probability: round(probability, 2),
      horizon_days: 30,
      risk: direction === "declining"
        ? "Position has been slipping over the last 30 days; without a change the decline is likely to continue."
        : (comp ?? 0) > 0.7 ? "High competition — improvement will need meaningful content or link work." : "Low",
      opportunity: nearThreshold ? `Currently #${k.current_position} — within reach of the top 10.` : null,
      confidence: series.length >= 21 ? "medium" : "low",
      factors: {
        history_days: series.length, recent_avg_position: round(recent, 2), previous_avg_position: round(older, 2),
        demand_confidence: d?.volume_confidence ?? "insufficient",
        note: "Probability is an evidence-weighted estimate, not a promise of ranking.",
      },
      computed_at: nowIso(),
    });
  }
  await upsert(sb, "seo_intel_forecasts", rows, "keyword,locale");
  return { records: rows.length, detail: `${rows.filter((r) => r.forecast_direction === "improving").length} keyword(s) trending up` };
}

/* ───────────────────── 7. cannibalization ───────────────────── */

export async function runCannibalization(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const { data: hist } = await sb.from("seo_intel_rank_history")
    .select("keyword, path, position, clicks, impressions, captured_on")
    .eq("locale", locale).gte("captured_on", dayOffset(45))
    .not("path", "is", null).limit(8000);
  if (!hist?.length) return { skipped: "No query→page history yet.", records: 0 };

  // keyword → set of paths that have ranked for it
  const kwPaths = new Map<string, Map<string, { clicks: number; impressions: number; pos: number[] }>>();
  for (const h of hist) {
    const m = kwPaths.get(h.keyword) ?? new Map();
    const e = m.get(h.path) ?? { clicks: 0, impressions: 0, pos: [] };
    e.clicks += h.clicks ?? 0; e.impressions += h.impressions ?? 0;
    if (h.position != null) e.pos.push(Number(h.position));
    m.set(h.path, e);
    kwPaths.set(h.keyword, m);
  }

  const clusters = new Map<string, { keywords: Set<string>; paths: Map<string, { clicks: number; impressions: number; pos: number[] }> }>();
  for (const [kw, paths] of kwPaths) {
    if (paths.size < 2) continue;
    const key = clusterKeyFor(kw);
    const c = clusters.get(key) ?? { keywords: new Set<string>(), paths: new Map() };
    c.keywords.add(kw);
    for (const [p, v] of paths) {
      const e = c.paths.get(p) ?? { clicks: 0, impressions: 0, pos: [] };
      e.clicks += v.clicks; e.impressions += v.impressions; e.pos.push(...v.pos);
      c.paths.set(p, e);
    }
    clusters.set(key, c);
  }

  const rows: any[] = [];
  for (const [key, c] of clusters) {
    if (c.paths.size < 2) continue;
    const ranked = [...c.paths.entries()].map(([path, v]) => ({
      path, clicks: v.clicks, impressions: v.impressions, avg_position: round(avg(v.pos) ?? 0, 2),
    })).sort((a, b) => b.clicks - a.clicks || (a.avg_position ?? 99) - (b.avg_position ?? 99));
    const strongest = ranked[0];
    const others = ranked.slice(1);
    // Overlap: how much of the impressions sit on the non-primary pages.
    const total = ranked.reduce((s, r) => s + r.impressions, 0) || 1;
    const overlap = round((total - strongest.impressions) / total, 2)!;
    if (overlap < 0.15) continue;

    const keywords = [...c.keywords];
    const action = overlap > 0.6 && others.every((o) => o.clicks === 0) ? "merge"
      : overlap > 0.45 ? "canonical"
      : "differentiate";
    rows.push({
      cluster_key: key,
      keyword: keywords[0],
      locale,
      paths: ranked.map((r) => r.path),
      shared_keywords: keywords.slice(0, 25),
      stronger_path: strongest.path,
      weaker_paths: others.map((o) => o.path),
      overlap_score: overlap,
      recommended_action: action,
      recommendation: action === "merge"
        ? `Merge the weaker page(s) into ${strongest.path} and 301-redirect them — they attract impressions but no clicks for the same intent.`
        : action === "canonical"
          ? `Point the weaker page(s) at ${strongest.path} with a canonical, or re-target them to a distinct intent.`
          : `Both pages earn traffic. Differentiate the angle and internally link the weaker page to ${strongest.path}.`,
      confidence: total > 200 ? "medium" : "low",
      evidence: { pages: ranked, shared_keyword_count: keywords.length, total_impressions: total, source: "gsc" },
      status: "open",
      computed_at: nowIso(),
    });
  }
  await upsert(sb, "seo_intel_cannibalization", rows, "cluster_key");
  return { records: rows.length, detail: `${rows.length} overlapping intent cluster(s) found` };
}

/* ───────────────────── 8. content gaps 2.0 ───────────────────── */

export async function runContentGaps(sb: any, _settings: any, payload: any = {}): Promise<StageResult> {
  const limit = Math.max(1, Math.min(10, Number(payload.limit ?? 5)));
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path, title, primary_keyword, word_count, has_schema, internal_links_out, avg_position, impressions, clicks, meta_description")
    .not("impressions", "is", null)
    .order("impressions", { ascending: false, nullsFirst: false }).limit(limit);
  if (!pages?.length) return { skipped: "No page performance data yet.", records: 0 };

  const { data: comps } = await sb.from("seo_intel_competitors")
    .select("domain, keyword, our_path, their_url, their_position, our_position, word_count, faq_count, schema_types").limit(60);

  const prompt = `You are an SEO content strategist for mbacompass.in (Indian MBA admissions).
For each of OUR pages below, list the specific content gaps versus what ranks for the same queries.

RULES:
- Use ONLY the data given. If the data does not support a gap, do not invent one.
- gap_type must be one of: topic, entity, question, comparison, data, evidence, faq, internal_link, structured.
- Never say "copy the competitor" — describe the missing information our page should add.
- value_score is 0-100 based on how much the gap could plausibly affect the page's ranking for its keyword.
- confidence is high | medium | low, based on how directly the data supports the gap.

OUR PAGES (Search Console actuals + our CMS):
${JSON.stringify(pages, null, 1)}

COMPETITOR SNAPSHOT (Semrush, estimated positions):
${JSON.stringify(comps ?? [], null, 1)}

Return STRICT JSON: {"gaps":[{"path":"","keyword":"","gap_type":"","title":"","description":"","competitor_domain":"","value_score":0,"priority":"high|medium|low","confidence":"high|medium|low"}]}`;

  const res = await callAIGateway({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are a precise SEO analyst. Output strict JSON only. Never fabricate metrics." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  }, { feature: "seo-intel-gaps" });
  if (!res.ok) throw new Error(`AI gap analysis failed [${res.status}]`);
  const parsed = parseAIJson<{ gaps: any[] }>((await res.json())?.choices?.[0]?.message?.content ?? "");
  const gaps = (parsed?.gaps ?? []).filter((g) => g?.title);

  // Replace the previous open set for these pages so the map stays current.
  const paths = pages.map((p: any) => p.path);
  await sb.from("seo_intel_content_gaps").delete().in("path", paths).eq("status", "open");
  const rows = gaps.slice(0, 60).map((g) => ({
    path: g.path ?? null, keyword: g.keyword ?? null,
    gap_type: ["topic", "entity", "question", "comparison", "data", "evidence", "faq", "internal_link", "structured"].includes(g.gap_type) ? g.gap_type : "topic",
    title: String(g.title).slice(0, 300),
    description: g.description ?? null,
    competitor_domain: g.competitor_domain ?? null,
    value_score: typeof g.value_score === "number" ? g.value_score : null,
    priority: ["high", "medium", "low"].includes(g.priority) ? g.priority : "medium",
    confidence: ["high", "medium", "low"].includes(g.confidence) ? g.confidence : "low",
    evidence: { source: "openai over gsc+semrush+cms", model: "gpt-4.1-mini" },
    status: "open",
    computed_at: nowIso(),
  }));
  await upsert(sb, "seo_intel_content_gaps", rows);
  return { records: rows.length, detail: `${rows.length} gap(s) mapped across ${pages.length} page(s)` };
}

/* ───────────────────── 9. entities / topical authority ───────────────────── */

const ENTITY_SOURCES: Array<{ table: string; type: string; nameCol: string; slugCol: string; pathPrefix: string }> = [
  { table: "colleges", type: "college", nameCol: "name", slugCol: "slug", pathPrefix: "/colleges/" },
  { table: "exams", type: "exam", nameCol: "name", slugCol: "slug", pathPrefix: "/exams/" },
];

export async function runEntityMap(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const { data: pages } = await sb.from("seo_intel_pages").select("path, entity_name, page_type, primary_keyword, word_count, clicks, impressions");
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, clicks, impressions, target_path").eq("locale", locale).limit(3000);

  const entities = new Map<string, { type: string; pages: string[]; kw: number; clicks: number; impressions: number }>();
  const add = (name: string, type: string, path?: string | null, clicks = 0, impressions = 0, kw = 0) => {
    const key = name.trim().toLowerCase();
    if (!key || key.length < 3) return;
    const e = entities.get(key) ?? { type, pages: [], kw: 0, clicks: 0, impressions: 0 };
    if (path && !e.pages.includes(path)) e.pages.push(path);
    e.kw += kw; e.clicks += clicks; e.impressions += impressions;
    entities.set(key, e);
  };

  for (const p of pages ?? []) {
    if (p.entity_name) add(p.entity_name, p.page_type ?? "other", p.path, p.clicks ?? 0, p.impressions ?? 0);
  }
  // Catalogue entities that should exist, even when we have no page for them.
  for (const src of ENTITY_SOURCES) {
    const { data } = await sb.from(src.table).select(`${src.nameCol}, ${src.slugCol}`).limit(1000);
    for (const r of data ?? []) {
      const name = (r as any)[src.nameCol];
      const slug = (r as any)[src.slugCol];
      if (!name || !slug) continue;
      add(name, src.type, `${src.pathPrefix}${slug}`);
    }
  }
  // Keyword-side signal: how much search demand mentions the entity.
  for (const k of kws ?? []) {
    const toks = tokenize(k.keyword);
    for (const [name, e] of entities) {
      if (toks.length && name.split(/\s+/).every((w) => toks.includes(w))) {
        e.kw += 1; e.clicks += k.clicks ?? 0; e.impressions += k.impressions ?? 0;
      }
    }
  }

  const rows = [...entities.entries()].slice(0, 1200).map(([name, e]) => {
    const state = e.pages.length === 0 ? "missing" : (e.impressions < 20 || e.kw === 0) ? "weak" : "covered";
    const score = Math.min(100, Math.round(e.pages.length * 20 + Math.min(e.kw, 20) * 2 + Math.min(e.impressions / 50, 20)));
    return {
      entity: name,
      entity_type: e.type,
      cluster: e.type,
      coverage_state: state,
      page_count: e.pages.length,
      pages: e.pages.slice(0, 20),
      keyword_count: e.kw,
      clicks: e.clicks,
      impressions: e.impressions,
      score,
      recommendation: state === "missing"
        ? "No page covers this entity — create a supporting page if search demand exists."
        : state === "weak"
          ? "Coverage exists but earns little visibility — deepen the content and add internal links from stronger pages."
          : null,
      evidence: { source: "cms + gsc", pages: e.pages.slice(0, 5) },
      computed_at: nowIso(),
    };
  });
  await upsert(sb, "seo_intel_entities", rows, "entity");
  const weak = rows.filter((r) => r.coverage_state !== "covered").length;
  return { records: rows.length, detail: `${rows.length} entities mapped, ${weak} weak or missing` };
}

/* ───────────────────── 10. internal linking ───────────────────── */

export async function runLinkIntel(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("path, entity_name, title, primary_keyword, word_count, clicks, impressions, avg_position, internal_links_out")
    .limit(2000);
  if (!pages?.length) return { skipped: "No pages crawled yet.", records: 0 };
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, target_path, impressions, current_position").eq("locale", locale)
    .order("impressions", { ascending: false, nullsFirst: false }).limit(400);

  // Targets worth strengthening: real demand, ranking just outside the money zone.
  const targets = (kws ?? []).filter((k: any) => k.target_path && k.current_position != null && k.current_position > 8 && k.current_position < 40);
  const pageList = pages as any[];
  const rows: any[] = [];

  for (const t of targets.slice(0, 60)) {
    const target = pageList.find((p) => p.path === t.target_path);
    if (!target) continue;
    const tTokens = tokenize(t.keyword);
    const donors = pageList
      .filter((p) => p.path !== t.target_path && (p.clicks ?? 0) > 0)
      .map((p) => ({
        p,
        rel: jaccard(tTokens, tokenize(`${p.entity_name ?? ""} ${p.title ?? ""} ${p.primary_keyword ?? ""}`)),
      }))
      .filter((d) => d.rel >= 0.15)
      .sort((a, b) => (b.p.clicks ?? 0) - (a.p.clicks ?? 0) || b.rel - a.rel)
      .slice(0, 2);

    for (const d of donors) {
      rows.push({
        source_path: d.p.path,
        target_path: t.target_path,
        anchor_suggestion: t.keyword,
        context_hint: `Inside the section of ${d.p.path} that discusses ${d.p.primary_keyword ?? d.p.entity_name ?? "this topic"}, link the phrase "${t.keyword}" to ${t.target_path}.`,
        relationship: d.rel > 0.4 ? "same topic cluster" : "related topic",
        target_importance: round(Math.min(100, (t.impressions ?? 0) / 10 + (40 - Number(t.current_position))), 1),
        score: round(Math.min(100, (d.p.clicks ?? 0) * 2 + d.rel * 40 + Math.max(0, 40 - Number(t.current_position))), 1),
        confidence: (d.p.clicks ?? 0) > 20 ? "medium" : "low",
        evidence: {
          donor_clicks: d.p.clicks, donor_impressions: d.p.impressions,
          target_position: t.current_position, target_impressions: t.impressions,
          topical_similarity: round(d.rel, 2), source: "gsc + internal",
        },
        status: "open",
        computed_at: nowIso(),
      });
    }
  }
  await upsert(sb, "seo_intel_link_opportunities", rows, "source_path,target_path,anchor_suggestion");
  return { records: rows.length, detail: `${rows.length} internal-link opportunity(ies)` };
}

/* ───────────────────── 11. CTR intelligence ───────────────────── */

export async function runCtrIntel(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const { data: kws } = await sb.from("seo_intel_keywords")
    .select("keyword, target_path, clicks, impressions, ctr, current_position, intent")
    .eq("locale", locale).not("current_position", "is", null)
    .gte("impressions", 50)
    .order("impressions", { ascending: false, nullsFirst: false }).limit(300);
  if (!kws?.length) return { skipped: "Not enough Search Console impressions yet to benchmark CTR.", records: 0 };

  // Build our OWN position-cohort benchmark from observed data — no external CTR curve.
  const cohort = new Map<number, number[]>();
  for (const k of kws as any[]) {
    const bucket = Math.max(1, Math.min(30, Math.round(Number(k.current_position))));
    const arr = cohort.get(bucket) ?? [];
    if (k.ctr != null) arr.push(Number(k.ctr));
    cohort.set(bucket, arr);
  }
  const cohortAvg = new Map<number, number | null>();
  for (const [b, arr] of cohort) cohortAvg.set(b, arr.length >= 3 ? avg(arr) : null);

  const rows: any[] = [];
  for (const k of kws as any[]) {
    const bucket = Math.max(1, Math.min(30, Math.round(Number(k.current_position))));
    // Prefer the query's own history when we have it.
    const { data: hist } = await sb.from("seo_intel_rank_history")
      .select("ctr, position, captured_on").eq("keyword", k.keyword).eq("locale", locale)
      .not("ctr", "is", null).order("captured_on", { ascending: false }).limit(60);
    const ownSeries = (hist ?? []).slice(7).map((h: any) => Number(h.ctr));
    const ownBench = ownSeries.length >= 7 ? avg(ownSeries) : null;
    const benchmark = ownBench ?? cohortAvg.get(bucket) ?? null;
    const source = ownBench != null ? "own_history" : cohortAvg.get(bucket) != null ? "position_cohort" : null;
    if (benchmark == null || !benchmark) continue;

    const delta = round(((Number(k.ctr) - benchmark) / benchmark) * 100, 1)!;
    if (delta > -20) continue; // only under-performers are worth a record

    const diagnosis =
      k.intent && ["informational"].includes(k.intent) && /admission|apply|fees/i.test(k.keyword) ? "intent_mismatch"
      : Number(k.current_position) <= 5 ? "title"
      : Number(k.current_position) <= 10 ? "meta_description"
      : "serp_competition";
    rows.push({
      path: k.target_path, query: k.keyword,
      position: k.current_position, ctr: k.ctr,
      benchmark_ctr: round(benchmark, 4), benchmark_source: source,
      ctr_delta_pct: delta,
      impressions: k.impressions,
      diagnosis,
      detail: `Ranks #${round(Number(k.current_position), 1)} with a ${(Number(k.ctr) * 100).toFixed(2)}% CTR against a ${(benchmark * 100).toFixed(2)}% benchmark (${source === "own_history" ? "this query's own history" : "our own pages at the same position"}), ${Math.abs(delta)}% below.`,
      confidence: source === "own_history" ? "high" : (k.impressions ?? 0) > 300 ? "medium" : "low",
      evidence: { impressions: k.impressions, clicks: k.clicks, benchmark_source: source, sample: ownSeries.length, source: "gsc" },
      computed_at: nowIso(),
    });
  }
  await upsert(sb, "seo_intel_ctr_intel", rows, "path,query");
  return { records: rows.length, detail: `${rows.length} query(ies) under their own CTR benchmark` };
}

/* ───────────────────── 18. anomaly detection ───────────────────── */

export async function runAnomalyScan(sb: any): Promise<StageResult> {
  const { data: hist } = await sb.from("seo_intel_page_history")
    .select("path, captured_on, clicks, impressions, ctr, avg_position")
    .gte("captured_on", dayOffset(45)).limit(9000);
  if (!hist?.length) return { skipped: "No page history yet — anomaly detection needs at least a week of snapshots.", records: 0 };

  const byPath = new Map<string, any[]>();
  for (const h of hist) {
    const arr = byPath.get(h.path) ?? [];
    arr.push(h);
    byPath.set(h.path, arr);
  }
  const rows: any[] = [];
  for (const [path, arrRaw] of byPath) {
    const arr = arrRaw.sort((a, b) => (a.captured_on < b.captured_on ? 1 : -1));
    if (arr.length < 10) continue;
    for (const metric of ["clicks", "impressions", "ctr", "avg_position"] as const) {
      const series = arr.map((a) => Number(a[metric])).filter((v) => isFinite(v));
      if (series.length < 10) continue;
      const observed = series[0];
      const baseline = series.slice(1, 29);
      const m = avg(baseline)!;
      const sd = stdev(baseline);
      if (sd == null || sd === 0) continue;
      const sigma = round((observed - m) / sd, 2)!;
      if (Math.abs(sigma) < 2) continue; // normal fluctuation — no alert
      const severity = Math.abs(sigma) >= 3 ? "anomaly" : "watch";
      rows.push({
        detected_on: today(), metric, scope: "page", path,
        observed: round(observed, 4), expected: round(m, 4), deviation_sigma: sigma,
        severity,
        classification: metric === "avg_position"
          ? (sigma > 0 ? "position_worsened" : "position_improved")
          : (sigma > 0 ? "spike" : "drop"),
        confidence: series.length >= 21 ? "medium" : "low",
        evidence: { baseline_days: baseline.length, baseline_mean: round(m, 4), stdev: round(sd, 4), latest: round(observed, 4), source: "gsc" },
      });
    }
  }
  const top = rows.sort((a, b) => Math.abs(b.deviation_sigma) - Math.abs(a.deviation_sigma)).slice(0, 60);
  await upsert(sb, "seo_intel_anomalies", top);
  return { records: top.length, detail: `${top.filter((r) => r.severity === "anomaly").length} significant anomaly(ies), ${top.filter((r) => r.severity === "watch").length} to watch` };
}

/* ───────────────────── 14+15+22. opportunity scoring & next best action ───────────────────── */

export async function runOpportunityScore(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const [{ data: kws }, { data: ctr }, { data: gaps }, { data: demand }, { data: pages }, { data: learn }] = await Promise.all([
    sb.from("seo_intel_keywords").select("keyword, target_path, impressions, clicks, ctr, current_position, search_volume, competition, intent").eq("locale", locale).limit(600),
    sb.from("seo_intel_ctr_intel").select("path, query, ctr_delta_pct, diagnosis, confidence, impressions"),
    sb.from("seo_intel_content_gaps").select("path, keyword, gap_type, title, value_score, priority").eq("status", "open"),
    sb.from("seo_intel_demand").select("keyword, trend_direction, emerging, volume_confidence").eq("locale", locale),
    sb.from("seo_intel_pages").select("path, ssr_gap, indexed_status, health_score, psi_lcp_ms, impressions, clicks"),
    sb.from("seo_intel_rec_outcomes").select("category, change_type, succeeded, implemented, avg_position_delta"),
  ]);
  const demandMap = new Map((demand ?? []).map((d: any) => [d.keyword, d]));
  const ctrMap = new Map((ctr ?? []).map((c: any) => [`${c.path}|${c.query}`, c]));
  const learnMap = new Map((learn ?? []).map((l: any) => [l.category, l]));

  const rows: any[] = [];

  // A. ranking opportunities — position distance + demand + observed impressions
  for (const k of (kws ?? []) as any[]) {
    if (k.current_position == null || !k.target_path) continue;
    const pos = Number(k.current_position);
    if (pos < 4 || pos > 35) continue;
    const d = demandMap.get(k.keyword);
    const distance = pos <= 10 ? pos - 3 : pos - 10;
    const factors = {
      current_position: pos,
      distance_to_threshold: round(distance, 1),
      impressions_28d: k.impressions ?? 0,
      clicks_28d: k.clicks ?? 0,
      provider_volume: k.search_volume ?? null,
      demand_direction: d?.trend_direction ?? "unknown",
      emerging_demand: !!d?.emerging,
      competition: k.competition ?? null,
      intent: k.intent ?? null,
      historical_success_rate: learnMap.get("content")
        ? round((learnMap.get("content").succeeded ?? 0) / Math.max(1, learnMap.get("content").implemented ?? 1), 2)
        : null,
      scoring: "score = demand(impressions & volume) + proximity to next threshold − competition, all from stored data",
    };
    const score = Math.min(100,
      Math.round(
        Math.min(40, Math.log10((k.impressions ?? 0) + 1) * 16) +
        Math.max(0, 30 - distance * 3) +
        (d?.emerging ? 12 : d?.trend_direction === "rising" ? 8 : 0) +
        (k.search_volume ? Math.min(10, Math.log10(k.search_volume) * 3) : 0) -
        (k.competition ? Number(k.competition) * 12 : 0),
      ));
    rows.push({
      kind: "ranking", path: k.target_path, keyword: k.keyword,
      title: `Push "${k.keyword}" from #${round(pos, 1)} into the ${pos <= 10 ? "top 3" : "top 10"}`,
      score, factors,
      rationale: `${k.impressions ?? 0} impressions and ${k.clicks ?? 0} clicks in the last 28 days (Search Console, actual), currently #${round(pos, 1)}${d?.trend_direction ? `, demand ${d.trend_direction}` : ""}.`,
      next_action: `Strengthen ${k.target_path} for "${k.keyword}": tighten the title and H1 around the query, add the missing sections and link to it from stronger pages.`,
      confidence: (k.impressions ?? 0) >= 100 ? "high" : (k.impressions ?? 0) >= 20 ? "medium" : "low",
      status: "open", computed_at: nowIso(),
    });
  }

  // B. CTR opportunities
  for (const c of (ctr ?? []) as any[]) {
    if (!c.path) continue;
    const score = Math.min(100, Math.round(Math.abs(c.ctr_delta_pct ?? 0) * 0.6 + Math.min(30, Math.log10((c.impressions ?? 0) + 1) * 12)));
    rows.push({
      kind: "ctr", path: c.path, keyword: c.query,
      title: `Recover click-through on "${c.query}"`,
      score,
      factors: { ctr_delta_pct: c.ctr_delta_pct, diagnosis: c.diagnosis, impressions: c.impressions, source: "gsc" },
      rationale: `CTR is ${Math.abs(c.ctr_delta_pct ?? 0)}% below its benchmark on ${c.impressions ?? 0} impressions.`,
      next_action: c.diagnosis === "title" ? "Rewrite the title tag to lead with the query and a concrete benefit."
        : c.diagnosis === "meta_description" ? "Rewrite the meta description with the specific detail searchers want."
        : c.diagnosis === "intent_mismatch" ? "The ranking page does not match what searchers want — re-target the query to the right page."
        : "Competition owns this SERP — pursue a rich result or a stronger angle.",
      confidence: c.confidence ?? "low",
      status: "open", computed_at: nowIso(),
    });
  }

  // C. content gaps
  for (const g of (gaps ?? []) as any[]) {
    rows.push({
      kind: "content_gap", path: g.path, keyword: g.keyword ?? g.gap_type,
      title: g.title,
      score: Math.min(100, Math.round(g.value_score ?? (g.priority === "high" ? 70 : g.priority === "medium" ? 50 : 30))),
      factors: { gap_type: g.gap_type, priority: g.priority, source: "ai over gsc+semrush+cms" },
      rationale: `Content gap of type "${g.gap_type}" identified against ranking pages.`,
      next_action: `Add the missing ${g.gap_type.replace("_", " ")} to ${g.path ?? "the target page"}.`,
      confidence: "medium", status: "open", computed_at: nowIso(),
    });
  }

  // D. technical blockers — measured, not guessed
  for (const p of (pages ?? []) as any[]) {
    const issues: string[] = [];
    if (p.ssr_gap) issues.push("crawlers receive almost no content from this URL");
    if (p.indexed_status && !/index/i.test(p.indexed_status)) issues.push(`Search Console reports "${p.indexed_status}"`);
    if (p.psi_lcp_ms && Number(p.psi_lcp_ms) > 2500) issues.push(`LCP ${Math.round(Number(p.psi_lcp_ms))}ms (PageSpeed, measured)`);
    if (!issues.length) continue;
    rows.push({
      kind: "technical", path: p.path, keyword: null,
      title: `Fix technical blockers on ${p.path}`,
      score: Math.min(100, 55 + issues.length * 10 + Math.min(20, Math.log10((p.impressions ?? 0) + 1) * 8)),
      factors: { issues, impressions: p.impressions, source: "firecrawl + gsc + pagespeed" },
      rationale: issues.join("; "),
      next_action: "Resolve the blockers above before investing in content for this URL.",
      confidence: "high", status: "open", computed_at: nowIso(),
    });
  }

  // Dedupe on (kind, path, keyword) and rank.
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = `${r.kind}|${r.path ?? ""}|${r.keyword ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.score - a.score).slice(0, 300);
  unique.forEach((r, i) => (r.priority_rank = i + 1));

  await sb.from("seo_intel_opportunities").delete().eq("status", "open");
  await upsert(sb, "seo_intel_opportunities", unique, "kind,path,keyword");
  return { records: unique.length, detail: unique[0] ? `Top action: ${unique[0].title}` : "No opportunities scored yet" };
}

/* ───────────────────── 16+17. page digital twin ───────────────────── */

export async function runPageTwin(sb: any, settings: any, payload: any = {}): Promise<StageResult> {
  const locale = localeOf(settings);
  const limit = Math.max(1, Math.min(60, Number(payload.limit ?? 25)));
  const { data: pages } = await sb.from("seo_intel_pages")
    .select("*").order("impressions", { ascending: false, nullsFirst: false }).limit(limit);
  if (!pages?.length) return { skipped: "No pages tracked yet.", records: 0 };

  const paths = pages.map((p: any) => p.path);
  const [{ data: kws }, { data: comps }, { data: links }, { data: gaps }, { data: exps }, { data: recs }, { data: ctr }] = await Promise.all([
    sb.from("seo_intel_keywords").select("keyword, target_path, current_position, clicks, impressions, ctr, search_volume, intent").in("target_path", paths),
    sb.from("seo_intel_competitors").select("our_path, domain, keyword, their_position, our_position, word_count, faq_count").in("our_path", paths),
    sb.from("seo_intel_link_opportunities").select("source_path, target_path, anchor_suggestion, score").in("target_path", paths),
    sb.from("seo_intel_content_gaps").select("path, gap_type, title, priority").in("path", paths).eq("status", "open"),
    sb.from("seo_intel_experiments").select("path, change_type, outcome, position_delta, changed_on").in("path", paths),
    sb.from("seo_intel_recommendations").select("path, category, status, problem").in("path", paths),
    sb.from("seo_intel_ctr_intel").select("path, query, ctr_delta_pct, diagnosis").in("path", paths),
  ]);

  const rows = (pages as any[]).map((p) => {
    const pKws = (kws ?? []).filter((k: any) => k.target_path === p.path);
    const pComps = (comps ?? []).filter((c: any) => c.our_path === p.path);
    const pGaps = (gaps ?? []).filter((g: any) => g.path === p.path);
    const pLinks = (links ?? []).filter((l: any) => l.target_path === p.path);
    const pCtr = (ctr ?? []).filter((c: any) => c.path === p.path);

    // Competitive gap score: transparent, factor-by-factor, only from measured values.
    const compWords = avg(pComps.map((c: any) => Number(c.word_count)).filter(Boolean));
    const factors: Record<string, any> = {
      content_depth: compWords != null && p.word_count
        ? { ours: p.word_count, competitors_avg: round(compWords, 0), gap_pct: round(((compWords - p.word_count) / compWords) * 100, 1) }
        : { note: "Competitor word counts not collected — not scored." },
      schema: { ours: !!p.has_schema, rendered: p.rendered_has_schema ?? null },
      faq: { competitors_avg: round(avg(pComps.map((c: any) => Number(c.faq_count)).filter((v: any) => v != null)) ?? 0, 1) },
      freshness: { last_crawl_at: p.last_crawl_at, updated_at: p.updated_at },
      internal_links: { out: p.internal_links_out, inbound_opportunities: pLinks.length },
      intent_alignment: pKws.length ? { primary_intent: pKws[0].intent } : { note: "No ranked query mapped." },
      crawler_visibility: { ssr_gap: p.ssr_gap, rendered_words: p.rendered_word_count, cms_words: p.word_count },
      speed: { lcp_ms: p.psi_lcp_ms, cls: p.psi_cls, tbt_ms: p.psi_tbt_ms },
    };
    let gapScore: number | null = null;
    const scored: number[] = [];
    if (compWords != null && p.word_count) scored.push(Math.max(0, Math.min(100, ((compWords - p.word_count) / compWords) * 100)));
    if (pGaps.length) scored.push(Math.min(100, pGaps.length * 15));
    if (p.ssr_gap) scored.push(90);
    if (!p.has_schema) scored.push(40);
    if (scored.length) gapScore = round(avg(scored)!, 1);

    const dataPoints = [p.impressions != null, pKws.length > 0, pComps.length > 0, p.psi_perf_score != null, p.rendered_word_count != null].filter(Boolean).length;
    const confidence: Confidence = dataPoints >= 4 ? "high" : dataPoints >= 2 ? "medium" : dataPoints >= 1 ? "low" : "insufficient";

    return {
      path: p.path,
      profile: {
        performance: { clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, avg_position: p.avg_position, position_change: p.position_change, window: p.perf_window, source: "gsc (actual)" },
        keywords: pKws.slice(0, 25),
        content: { title: p.title, meta_description: p.meta_description, word_count: p.word_count, has_schema: p.has_schema, health_score: p.health_score, issues: p.health_issues },
        technical: { indexed_status: p.indexed_status, ssr_gap: p.ssr_gap, rendered_word_count: p.rendered_word_count, psi_perf_score: p.psi_perf_score, psi_lcp_ms: p.psi_lcp_ms },
        competitors: pComps.slice(0, 10),
        gaps: pGaps.slice(0, 15),
        internal_links: pLinks.slice(0, 10),
        ctr_signals: pCtr.slice(0, 10),
        history: (exps ?? []).filter((e: any) => e.path === p.path),
        recommendations: (recs ?? []).filter((r: any) => r.path === p.path).slice(0, 15),
      },
      competitive_gap_score: gapScore,
      gap_factors: factors,
      confidence,
      summary: dataPoints === 0
        ? "Insufficient data to profile this page."
        : `${p.clicks ?? 0} clicks / ${p.impressions ?? 0} impressions, ${pKws.length} mapped queries, ${pGaps.length} open gaps, ${pComps.length} competitor rows.`,
      updated_at: nowIso(),
    };
  });
  await upsert(sb, "seo_intel_page_profiles", rows, "path");
  return { records: rows.length, detail: `${rows.length} page profile(s) refreshed` };
}

/* ───────────────────── 12+13. attribution & learning ───────────────────── */

export async function runImpactAttribution(sb: any): Promise<StageResult> {
  const { data: exps } = await sb.from("seo_intel_experiments").select("*").not("result_captured_on", "is", null).limit(200);
  if (!exps?.length) return { skipped: "No measured experiments yet.", records: 0 };

  // Site-wide trend acts as the control group: a page that moves with the whole
  // site is not evidence that the change worked.
  const { data: siteHist } = await sb.from("seo_intel_page_history")
    .select("captured_on, clicks, impressions, avg_position").gte("captured_on", dayOffset(90)).limit(9000);
  const byDay = new Map<string, { pos: number[]; clicks: number }>();
  for (const h of siteHist ?? []) {
    const e = byDay.get(h.captured_on) ?? { pos: [], clicks: 0 };
    if (h.avg_position != null) e.pos.push(Number(h.avg_position));
    e.clicks += h.clicks ?? 0;
    byDay.set(h.captured_on, e);
  }
  const dayPos = (d: string) => {
    const e = byDay.get(d);
    return e && e.pos.length ? avg(e.pos) : null;
  };

  let updated = 0;
  for (const e of exps) {
    const basePos = e.baseline_position != null ? Number(e.baseline_position) : null;
    const resPos = e.result_position != null ? Number(e.result_position) : null;
    if (basePos == null || resPos == null) continue;
    const pageDelta = round(basePos - resPos, 2)!;
    const siteBefore = e.baseline_captured_on ? dayPos(e.baseline_captured_on) : null;
    const siteAfter = e.result_captured_on ? dayPos(e.result_captured_on) : null;
    const siteDelta = siteBefore != null && siteAfter != null ? round(siteBefore - siteAfter, 2) : null;
    const isolated = siteDelta != null ? round(pageDelta - siteDelta, 2) : null;

    let impact: string;
    if (Math.abs(pageDelta) < 0.5) impact = "inconclusive";
    else if (siteDelta == null) impact = "low";
    else if (isolated != null && Math.abs(isolated) >= 2 && Math.sign(isolated) === Math.sign(pageDelta)) impact = "high";
    else if (isolated != null && Math.abs(isolated) >= 0.8) impact = "medium";
    else impact = "low";

    await sb.from("seo_intel_experiments").update({
      impact_confidence: impact,
      attribution: {
        page_position_delta: pageDelta,
        sitewide_position_delta: siteDelta,
        isolated_delta: isolated,
        method: "page delta minus site-wide delta over the same dates (Search Console history as control)",
        note: siteDelta == null
          ? "No site-wide control data for these dates — the movement cannot be attributed to the change with confidence."
          : `The site moved ${siteDelta} places on average over the same window; the page moved ${pageDelta}.`,
      },
    }).eq("id", e.id);
    if (e.recommendation_id) {
      await sb.from("seo_intel_recommendations").update({
        impact_confidence: impact,
        state: impact === "inconclusive" ? "validating" : (isolated ?? pageDelta) > 0 ? "successful" : "unsuccessful",
      }).eq("id", e.recommendation_id);
    }
    updated++;
  }

  // Learning rollup per category.
  const { data: recs } = await sb.from("seo_intel_recommendations")
    .select("id, category, change_type, state, impact_confidence").limit(2000);
  const { data: exps2 } = await sb.from("seo_intel_experiments")
    .select("recommendation_id, position_delta, changed_on, result_captured_on, outcome").limit(2000);
  const expMap = new Map((exps2 ?? []).map((x: any) => [x.recommendation_id, x]));
  const agg = new Map<string, any>();
  for (const r of recs ?? []) {
    const key = `${r.category ?? "general"}|${r.change_type ?? "any"}`;
    const a = agg.get(key) ?? { category: r.category ?? "general", change_type: r.change_type ?? "any", implemented: 0, succeeded: 0, failed: 0, inconclusive: 0, deltas: [] as number[], days: [] as number[], samples: [] as any[] };
    const x = expMap.get(r.id);
    if (x) {
      a.implemented++;
      if (x.position_delta != null) a.deltas.push(Number(x.position_delta));
      if (x.changed_on && x.result_captured_on) {
        a.days.push((new Date(x.result_captured_on).getTime() - new Date(x.changed_on).getTime()) / 86400000);
      }
      if (r.state === "successful" || x.outcome === "improved") a.succeeded++;
      else if (r.state === "unsuccessful" || x.outcome === "declined") a.failed++;
      else a.inconclusive++;
      if (a.samples.length < 10) a.samples.push({ recommendation_id: r.id, position_delta: x.position_delta, outcome: x.outcome });
    }
    agg.set(key, a);
  }
  const learnRows = [...agg.values()].filter((a) => a.implemented > 0).map((a) => ({
    category: a.category, change_type: a.change_type,
    implemented: a.implemented, succeeded: a.succeeded, failed: a.failed, inconclusive: a.inconclusive,
    avg_position_delta: round(avg(a.deltas), 2),
    avg_days_to_impact: round(avg(a.days), 1),
    samples: a.samples,
    updated_at: nowIso(),
  }));
  await upsert(sb, "seo_intel_rec_outcomes", learnRows, "category,change_type");
  return { records: updated, detail: `${updated} experiment(s) attributed, ${learnRows.length} learning row(s) updated` };
}

/* ───────────────────── 21. knowledge graph ───────────────────── */

export async function runKnowledgeGraph(sb: any, settings: any): Promise<StageResult> {
  const locale = localeOf(settings);
  const [{ data: pages }, { data: kws }, { data: comps }, { data: recs }] = await Promise.all([
    sb.from("seo_intel_pages").select("path, page_type, entity_name, primary_keyword").limit(2000),
    sb.from("seo_intel_keywords").select("keyword, target_path, intent").eq("locale", locale).limit(1500),
    sb.from("seo_intel_competitors").select("domain, keyword, our_path").limit(600),
    sb.from("seo_intel_recommendations").select("id, path, category, state").limit(600),
  ]);
  const edges: any[] = [];
  const push = (from_type: string, from_id: string, edge: string, to_type: string, to_id: string, weight = 1, evidence: any = {}) => {
    if (!from_id || !to_id) return;
    edges.push({ from_type, from_id, edge, to_type, to_id, weight, evidence, updated_at: nowIso() });
  };
  for (const p of pages ?? []) {
    if (p.entity_name) push("entity", p.entity_name.toLowerCase(), "has_page", "page", p.path, 1, { page_type: p.page_type });
    if (p.primary_keyword) push("page", p.path, "targets", "keyword", p.primary_keyword);
  }
  for (const k of kws ?? []) {
    if (k.target_path) push("keyword", k.keyword, "ranks_on", "page", k.target_path);
    if (k.intent) push("keyword", k.keyword, "has_intent", "intent", k.intent);
  }
  for (const c of comps ?? []) {
    push("competitor", c.domain, "competes_for", "keyword", c.keyword);
    if (c.our_path) push("competitor", c.domain, "outranks_page", "page", c.our_path);
  }
  for (const r of recs ?? []) {
    if (r.path) push("recommendation", r.id, "applies_to", "page", r.path, 1, { category: r.category, state: r.state });
  }
  const seen = new Set<string>();
  const unique = edges.filter((e) => {
    const k = `${e.from_type}|${e.from_id}|${e.edge}|${e.to_type}|${e.to_id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 5000);
  await upsert(sb, "seo_intel_graph_edges", unique, "from_type,from_id,edge,to_type,to_id");
  return { records: unique.length, detail: `${unique.length} relationship(s) in the SEO knowledge graph` };
}

/* ───────────────────── 23+27. strategy & intelligence report ───────────────────── */

export async function runStrategy(sb: any): Promise<StageResult> {
  const [{ data: opps }, { data: gaps }, { data: ctr }, { data: cann }, { data: anom }, { data: vol }, { data: learn }, { data: ents }] = await Promise.all([
    sb.from("seo_intel_opportunities").select("kind, path, keyword, title, score, rationale, next_action, confidence").eq("status", "open").order("score", { ascending: false }).limit(40),
    sb.from("seo_intel_content_gaps").select("path, gap_type, title, priority").eq("status", "open").limit(40),
    sb.from("seo_intel_ctr_intel").select("path, query, ctr_delta_pct, diagnosis").order("ctr_delta_pct", { ascending: true }).limit(20),
    sb.from("seo_intel_cannibalization").select("cluster_key, stronger_path, weaker_paths, recommended_action").eq("status", "open").limit(15),
    sb.from("seo_intel_anomalies").select("metric, path, severity, classification, deviation_sigma").eq("severity", "anomaly").order("detected_on", { ascending: false }).limit(15),
    sb.from("seo_intel_volatility").select("detected_on, classification, keywords_moved, keywords_tracked, confidence").order("detected_on", { ascending: false }).limit(3),
    sb.from("seo_intel_rec_outcomes").select("category, change_type, implemented, succeeded, avg_position_delta, avg_days_to_impact"),
    sb.from("seo_intel_entities").select("entity, coverage_state").neq("coverage_state", "covered").limit(40),
  ]);

  const coverage = {
    opportunities: (opps ?? []).length,
    content_gaps: (gaps ?? []).length,
    ctr_signals: (ctr ?? []).length,
    cannibalization_clusters: (cann ?? []).length,
    anomalies: (anom ?? []).length,
    learning_rows: (learn ?? []).length,
    weak_or_missing_entities: (ents ?? []).length,
  };
  const total = Object.values(coverage).reduce((a, b) => a + b, 0);
  if (total === 0) {
    await sb.from("seo_intel_strategy").insert({
      summary: "Insufficient data to determine a strategy. Run the monitoring stages (Search Console, crawl, keyword metrics) first.",
      priorities: [], confidence: "insufficient", data_coverage: coverage,
    });
    return { records: 1, detail: "Insufficient data — strategy not generated." };
  }

  const prompt = `You are the head of SEO for mbacompass.in (Indian MBA admissions).
Write a prioritized growth strategy from the stored evidence below. Every priority MUST cite the actual pages, keywords and numbers given.

RULES:
- Use ONLY the data provided. If a priority area has no supporting data, write "Insufficient data to determine." for it.
- Exactly five priority areas, in this order: Ranking Opportunities, Content Gaps, CTR Opportunities, Technical Problems, Competitive Gaps.
- Each priority: what to do, which pages/keywords, the evidence (quote the numbers), expected effect, and effort (low/medium/high).
- Never invent a ranking, volume, traffic figure or prediction.

SCORED OPPORTUNITIES: ${JSON.stringify(opps ?? [])}
CONTENT GAPS: ${JSON.stringify(gaps ?? [])}
CTR UNDERPERFORMERS: ${JSON.stringify(ctr ?? [])}
CANNIBALIZATION: ${JSON.stringify(cann ?? [])}
ANOMALIES: ${JSON.stringify(anom ?? [])}
RANKING VOLATILITY: ${JSON.stringify(vol ?? [])}
WHAT WORKED BEFORE (our own outcome history): ${JSON.stringify(learn ?? [])}
WEAK / MISSING ENTITIES: ${JSON.stringify(ents ?? [])}

Return STRICT JSON:
{"summary":"", "priorities":[{"rank":1,"area":"","headline":"","actions":[{"what":"","path":"","keyword":"","evidence":"","expected_effect":"","effort":"low|medium|high"}],"confidence":"high|medium|low|insufficient"}]}`;

  const res = await callAIGateway({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are a precise SEO strategist. Output strict JSON only. Never fabricate metrics; say 'Insufficient data to determine.' instead." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  }, { feature: "seo-intel-strategy" });
  if (!res.ok) throw new Error(`AI strategy failed [${res.status}]`);
  const parsed = parseAIJson<any>((await res.json())?.choices?.[0]?.message?.content ?? "");
  const confidence = total > 40 ? "high" : total > 12 ? "medium" : "low";

  await sb.from("seo_intel_strategy").insert({
    summary: parsed?.summary ?? "Strategy generated from stored SEO evidence.",
    priorities: parsed?.priorities ?? [],
    evidence: { opportunities: (opps ?? []).slice(0, 10), learning: learn ?? [], volatility: vol ?? [] },
    confidence,
    data_coverage: coverage,
  });
  return { records: 1, detail: parsed?.summary?.slice(0, 160) ?? "Strategy generated" };
}

/* ───────────────────── 24+25. validation & dedup for recommendations ───────────────────── */

export function dedupeHash(path: string | null, category: string, changeType: string | null) {
  return `${path ?? "site"}|${category}|${(changeType ?? "any").toLowerCase()}`;
}

/**
 * Self-validation before a recommendation is stored. Returns an evidence score
 * (0-1) and a reason when the recommendation should be suppressed or downgraded.
 */
export async function validateRecommendation(sb: any, rec: any): Promise<{ ok: boolean; score: number; reason: string; checks: any }> {
  const checks: any = {};
  let score = 0.2;

  if (rec.path) {
    const { data: page } = await sb.from("seo_intel_pages")
      .select("title, meta_description, impressions, clicks, ctr, avg_position, word_count, has_schema, ssr_gap, indexed_status")
      .eq("path", rec.path).maybeSingle();
    checks.page_found = !!page;
    if (!page) return { ok: false, score: 0, reason: "No stored data exists for this page — suppressed.", checks };
    checks.has_performance = page.impressions != null;
    if (page.impressions != null) score += 0.25;
    if ((page.impressions ?? 0) >= 50) score += 0.1;

    const ct = String(rec.change_type ?? "").toLowerCase();
    if (ct.includes("title") || ct.includes("meta")) {
      const { data: ctrRow } = await sb.from("seo_intel_ctr_intel").select("ctr_delta_pct, diagnosis").eq("path", rec.path).maybeSingle();
      checks.ctr_evidence = ctrRow ?? null;
      if (ctrRow) score += 0.25;
      else if ((page.impressions ?? 0) < 20) {
        return { ok: false, score, reason: "No measured CTR problem and too few impressions to justify a title/meta change — suppressed.", checks };
      }
      checks.current_title = page.title;
    }
    if (ct.includes("content") || rec.category === "content") {
      checks.word_count = page.word_count;
      if (page.word_count != null) score += 0.15;
    }
    if (rec.category === "technical" || rec.category === "indexing") {
      checks.ssr_gap = page.ssr_gap;
      checks.indexed_status = page.indexed_status;
      if (page.ssr_gap || (page.indexed_status && !/index/i.test(page.indexed_status))) score += 0.3;
    }
  }

  // Prior outcomes for this kind of change on this site.
  const { data: learn } = await sb.from("seo_intel_rec_outcomes")
    .select("implemented, succeeded, avg_position_delta")
    .eq("category", rec.category ?? "general").maybeSingle();
  if (learn?.implemented) {
    checks.history = learn;
    const rate = learn.succeeded / Math.max(1, learn.implemented);
    score += rate >= 0.5 ? 0.15 : 0;
    if (learn.implemented >= 5 && rate < 0.2) {
      return { ok: false, score, reason: `Our own history shows this change type succeeded in only ${learn.succeeded}/${learn.implemented} cases — downgraded and suppressed.`, checks };
    }
  }
  score = Math.min(1, Number(score.toFixed(2)));
  return { ok: score >= 0.35, score, reason: score >= 0.35 ? "Validated against stored evidence." : "Evidence too weak — suppressed.", checks };
}

/** Insert-or-update with lifecycle states so the same advice is never duplicated. */
export async function upsertRecommendation(sb: any, rec: any, validation: any) {
  const hash = dedupeHash(rec.path ?? null, rec.category ?? "general", rec.change_type ?? null);
  const { data: existing } = await sb.from("seo_intel_recommendations")
    .select("id, occurrences, state, status").eq("dedupe_hash", hash).maybeSingle();
  if (existing) {
    if (["applied", "successful", "unsuccessful"].includes(existing.state)) return "skipped";
    await sb.from("seo_intel_recommendations").update({
      problem: rec.problem, recommended_change: rec.recommended_change,
      evidence: rec.evidence, why_it_matters: rec.why_it_matters,
      before_value: rec.before_value, after_value: rec.after_value,
      expected_impact: rec.expected_impact, confidence: rec.confidence,
      priority: rec.priority, occurrences: (existing.occurrences ?? 1) + 1,
      last_seen_at: nowIso(), state: "updated",
      validation, evidence_score: validation?.score ?? null, updated_at: nowIso(),
    }).eq("id", existing.id);
    return "updated";
  }
  const { error } = await sb.from("seo_intel_recommendations").insert({
    ...rec, dedupe_hash: hash, state: "new", last_seen_at: nowIso(),
    validation, evidence_score: validation?.score ?? null,
  });
  return error ? "error" : "inserted";
}

/* ───────────────────── stage registry ───────────────────── */

export const ADVANCED_STAGES: Record<string, (sb: any, settings: any, payload: any) => Promise<StageResult>> = {
  demand_model: (sb, s, p) => runDemandModel(sb, s, p),
  intent_scan: (sb, s, p) => runIntentScan(sb, s, p),
  serp_intel: (sb, s, p) => runSerpIntel(sb, s, p),
  volatility_scan: (sb, s) => runVolatility(sb, s),
  forecast: (sb, s, p) => runForecast(sb, s, p),
  cannibalization: (sb, s) => runCannibalization(sb, s),
  content_gaps: (sb, s, p) => runContentGaps(sb, s, p),
  entity_map: (sb, s) => runEntityMap(sb, s),
  link_intel: (sb, s) => runLinkIntel(sb, s),
  ctr_intel: (sb, s) => runCtrIntel(sb, s),
  anomaly_scan: (sb) => runAnomalyScan(sb),
  opportunity_score: (sb, s) => runOpportunityScore(sb, s),
  page_twin: (sb, s, p) => runPageTwin(sb, s, p),
  impact_attribution: (sb) => runImpactAttribution(sb),
  knowledge_graph: (sb, s) => runKnowledgeGraph(sb, s),
  strategy: (sb) => runStrategy(sb),
};

export const ADVANCED_LABELS: Record<string, string> = {
  demand_model: "Search demand model (multi-source)",
  intent_scan: "Search intent classification & shift detection",
  serp_intel: "SERP intelligence snapshot",
  volatility_scan: "Ranking volatility monitor",
  forecast: "Ranking forecast",
  cannibalization: "Keyword cannibalization detection",
  content_gaps: "Content gap intelligence",
  entity_map: "Entity & topical authority map",
  link_intel: "Internal linking intelligence",
  ctr_intel: "CTR benchmarking",
  anomaly_scan: "Anomaly detection",
  opportunity_score: "Opportunity scoring & next best action",
  page_twin: "Page SEO intelligence profiles",
  impact_attribution: "SEO change impact attribution",
  knowledge_graph: "SEO knowledge graph",
  strategy: "AI SEO growth strategy",
};
