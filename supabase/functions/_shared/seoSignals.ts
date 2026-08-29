// Shared utilities for the Enterprise AI SEO Automation Suite.
//
// Covers: Google Search Console ingestion helpers, search-intent
// classification, entity extraction, duplication detection and the
// unified page health score used by every engine and the post-publish
// pipeline.

import { SILO_SOURCES, SITE_URL, stripHtml, flattenText, wordCount } from "./silo.ts";

export { SILO_SOURCES, SITE_URL, stripHtml, flattenText, wordCount };

export const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

export const gscHeaders = () => ({
  Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY") ?? ""}`,
  "X-Connection-Api-Key": Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY") ?? "",
  "Content-Type": "application/json",
});

export const gscConfigured = () =>
  Boolean(Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY"));

export const dayOffset = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

/** Resolve the single verified GSC property covering the site (or candidates). */
export async function resolveGscSite(
  target = SITE_URL,
): Promise<{ siteUrl?: string; candidates?: string[]; error?: string }> {
  const res = await fetch(`${GSC_GATEWAY}/webmasters/v3/sites`, { headers: gscHeaders() });
  if (!res.ok) return { error: `Search Console list failed [${res.status}]: ${await res.text()}` };
  const json = await res.json().catch(() => ({}));
  const entries: Array<{ siteUrl: string; permissionLevel?: string }> = json.siteEntry ?? [];
  const url = new URL(target);
  const covers = (siteUrl: string) => {
    if (siteUrl.startsWith("sc-domain:")) {
      const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
      const host = url.hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    }
    try {
      return url.href.startsWith(new URL(siteUrl).href);
    } catch {
      return false;
    }
  };
  const matches = entries
    .filter((e) => e.permissionLevel !== "siteUnverifiedUser" && covers(e.siteUrl))
    .map((e) => e.siteUrl);
  if (matches.length === 0) return { error: "No verified Search Console property covers this site." };
  if (matches.length === 1) return { siteUrl: matches[0] };
  return { candidates: matches };
}

export interface GscRow {
  path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
}

export const toPath = (raw: string): string => {
  try {
    const u = new URL(raw);
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return raw.replace(/\/+$/, "") || "/";
  }
};

/** Search Analytics query grouped by page. */
export async function gscPageMetrics(
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 5000,
): Promise<GscRow[]> {
  const res = await fetch(
    `${GSC_GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: gscHeaders(),
      body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit }),
    },
  );
  if (!res.ok) throw new Error(`GSC page query failed [${res.status}]: ${await res.text()}`);
  const json = await res.json().catch(() => ({}));
  return (json.rows ?? []).map((r: any) => ({
    path: toPath(r.keys?.[0] ?? ""),
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: r.position != null ? Number(r.position) : null,
  }));
}

/** Search Analytics query grouped by page + query (keyword level). */
export async function gscQueryMetrics(
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 5000,
): Promise<Array<GscRow & { query: string }>> {
  const res = await fetch(
    `${GSC_GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: gscHeaders(),
      body: JSON.stringify({ startDate, endDate, dimensions: ["query", "page"], rowLimit }),
    },
  );
  if (!res.ok) throw new Error(`GSC query query failed [${res.status}]: ${await res.text()}`);
  const json = await res.json().catch(() => ({}));
  return (json.rows ?? []).map((r: any) => ({
    query: String(r.keys?.[0] ?? "").toLowerCase().trim(),
    path: toPath(r.keys?.[1] ?? ""),
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: r.position != null ? Number(r.position) : null,
  }));
}

/** URL Inspection — index state for a single URL. */
export async function gscIndexState(siteUrl: string, inspectionUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${GSC_GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: gscHeaders(),
      body: JSON.stringify({ inspectionUrl, siteUrl }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return json?.inspectionResult?.indexStatusResult?.coverageState ?? null;
  } catch {
    return null;
  }
}

/* ------------------------- search intent utilities ------------------------ */

export type IntentType = "informational" | "commercial" | "transactional" | "navigational" | "comparison";

const INTENT_RULES: Array<{ type: IntentType; patterns: RegExp[] }> = [
  { type: "transactional", patterns: [/\b(buy|price|fees?|admission form|apply|enroll|register|coupon|discount)\b/] },
  { type: "comparison", patterns: [/\b(vs|versus|compare|comparison|better|difference between|or)\b/] },
  { type: "commercial", patterns: [/\b(best|top \d+|coaching|classes|institute|course|mock tests?|reviews?|ranking)\b/] },
  { type: "navigational", patterns: [/\b(login|official website|portal|download|result|admit card)\b/] },
  { type: "informational", patterns: [/\b(what|how|why|when|guide|syllabus|pattern|eligibility|preparation|tips|meaning)\b/] },
];

export function classifyIntent(keyword: string): IntentType {
  const k = (keyword || "").toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(k))) return rule.type;
  }
  return "informational";
}

const STOPWORDS = new Set([
  "the", "a", "an", "in", "for", "of", "to", "and", "or", "is", "are", "with", "on", "at", "by",
  "from", "best", "top", "vs", "versus", "india", "2024", "2025", "2026", "2027", "mba", "list",
]);

export const tokenize = (s: string): string[] =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

/** Jaccard similarity of two token sets. */
export function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Stable cluster key for a keyword (sorted significant tokens). */
export const clusterKeyFor = (keyword: string): string =>
  Array.from(new Set(tokenize(keyword))).sort().slice(0, 5).join("-") || keyword.toLowerCase();

/* ---------------------------- entity utilities ---------------------------- */

export type EntityType =
  | "institution" | "exam" | "city" | "program" | "person" | "organization" | "concept" | "other";

export const normalizeEntity = (name: string): string =>
  (name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Count entity mentions in plain text (word-boundary safe, alias aware). */
export function countMentions(text: string, name: string, aliases: string[] = []): number {
  const hay = ` ${(text || "").toLowerCase()} `;
  const needles = [name, ...aliases].map((n) => normalizeEntity(n)).filter(Boolean);
  let total = 0;
  for (const n of needles) {
    if (n.length < 3) continue;
    let idx = 0;
    while ((idx = hay.indexOf(n, idx)) !== -1) {
      total++;
      idx += n.length;
    }
  }
  return total;
}

/* ------------------------- duplication / similarity ----------------------- */

export function shingles(text: string, size = 4): Set<string> {
  const tokens = tokenize(text).slice(0, 800);
  const out = new Set<string>();
  for (let i = 0; i + size <= tokens.length; i++) out.add(tokens.slice(i, i + size).join(" "));
  return out;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  return inter / Math.min(a.size, b.size);
}

/* ------------------------------ health score ------------------------------ */

export interface HealthInput {
  words: number;
  hasTitle: boolean;
  hasDescription: boolean;
  hasKeyword: boolean;
  schemaValid: boolean;
  faqCount: number;
  internalLinks: number;
  duplicationScore: number;   // 0-100, higher = more duplicated
  entityCoverage: number;     // 0-100
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
  decayState: string;
}

export interface HealthResult {
  health_score: number;
  content_score: number;
  schema_score: number;
  intent_score: number;
  issues: string[];
}

export const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function scoreHealth(i: HealthInput): HealthResult {
  const issues: string[] = [];

  let content = 0;
  if (i.words >= 1200) content += 40;
  else if (i.words >= 700) content += 32;
  else if (i.words >= 350) content += 22;
  else {
    content += 8;
    issues.push(`Thin content (${i.words} words) — target 700+.`);
  }
  if (i.hasTitle) content += 10; else issues.push("Missing SEO title.");
  if (i.hasDescription) content += 10; else issues.push("Missing meta description.");
  if (i.hasKeyword) content += 10; else issues.push("No primary keyword assigned.");
  if (i.internalLinks >= 3) content += 10;
  else issues.push(`Only ${i.internalLinks} internal links — add contextual links.`);
  if (i.faqCount >= 3) content += 10; else issues.push("Fewer than 3 FAQs (hurts AEO).");
  content = clamp100(content + 10);

  let schema = i.schemaValid ? 70 : 20;
  if (!i.schemaValid) issues.push("Structured data missing or invalid.");
  if (i.faqCount >= 3) schema += 20;
  if (i.hasDescription) schema += 10;
  schema = clamp100(schema);

  let intent = 60;
  if (i.hasKeyword) intent += 15;
  if (i.duplicationScore >= 70) {
    intent -= 35;
    issues.push("Near-duplicate of another page — intent overlap.");
  } else if (i.duplicationScore >= 45) {
    intent -= 15;
    issues.push("Partial content overlap with another page.");
  }
  if (i.position != null && i.position > 20 && i.impressions > 100) {
    intent -= 10;
    issues.push(`Ranking at position ${i.position.toFixed(1)} despite ${i.impressions} impressions.`);
  }
  intent = clamp100(intent);

  let perf = 50;
  if (i.impressions > 0) {
    perf = clamp100(20 + Math.min(40, Math.log10(1 + i.impressions) * 14) + Math.min(40, i.ctr * 800));
  }
  if (i.decayState === "decaying") {
    perf -= 20;
    issues.push("Traffic decaying vs previous period.");
  } else if (i.decayState === "dying") {
    perf -= 35;
    issues.push("Severe traffic decline vs previous period.");
  }
  perf = clamp100(perf);

  const health = clamp100(
    content * 0.34 + schema * 0.16 + intent * 0.2 + perf * 0.2 + i.entityCoverage * 0.1,
  );

  return { health_score: health, content_score: content, schema_score: schema, intent_score: intent, issues };
}

/* --------------------------------- helpers -------------------------------- */

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Parse a JSON object out of an AI response that may be fenced or prefixed. */
export function parseAIJson<T = any>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const slice = cleaned.slice(start);
  try {
    return JSON.parse(slice) as T;
  } catch {
    // Trim trailing garbage after the last closing brace/bracket.
    const lastObj = Math.max(slice.lastIndexOf("}"), slice.lastIndexOf("]"));
    if (lastObj === -1) return null;
    try {
      return JSON.parse(slice.slice(0, lastObj + 1)) as T;
    } catch {
      return null;
    }
  }
}

/** Load engine automation settings with safe defaults. */
export async function loadSettings(sb: any) {
  const { data } = await sb.from("seo_engine_settings").select("*").eq("id", true).maybeSingle();
  return {
    intent_enabled: data?.intent_enabled ?? true,
    decay_enabled: data?.decay_enabled ?? true,
    entity_enabled: data?.entity_enabled ?? true,
    postpublish_enabled: data?.postpublish_enabled ?? true,
    auto_apply_safe_actions: data?.auto_apply_safe_actions ?? false,
    decay_click_drop_pct: Number(data?.decay_click_drop_pct ?? 25),
    decay_min_impressions: Number(data?.decay_min_impressions ?? 50),
    cannibalization_min_overlap: Number(data?.cannibalization_min_overlap ?? 0.6),
    max_actions_per_run: Number(data?.max_actions_per_run ?? 100),
    gsc_site_url: data?.gsc_site_url ?? null,
  };
}

/** Fetch every public page row from the SILO source registry. */
export async function loadPages(sb: any, sources = SILO_SOURCES) {
  const pages: Array<{
    path: string;
    name: string | null;
    page_type: string;
    source_table: string;
    source_id: string;
    source_field: string;
    keyword: string | null;
    topic: string | null;
    html: string;
    text: string;
    words: number;
  }> = [];

  for (const src of sources) {
    let q = sb.from(src.table).select(src.columns);
    if (src.filter) q = src.filter(q);
    const { data, error } = await q.limit(2000);
    if (error || !data) continue;
    for (const row of data) {
      const path = src.pathFor(row, {});
      if (!path) continue;
      const html = src.htmlFor(row).map((v) => flattenText(v)).join("\n");
      const extra = (src.textFor?.(row) ?? []).map((v) => flattenText(v)).join("\n");
      const text = stripHtml(`${html}\n${extra}`);
      pages.push({
        path,
        name: src.nameFor(row),
        page_type: src.page_type,
        source_table: src.table,
        source_id: row.id,
        source_field: src.field,
        keyword: src.keywordFor?.(row) ?? null,
        topic: src.topicFor?.(row) ?? null,
        html,
        text,
        words: wordCount(text),
      });
    }
  }
  return pages;
}
