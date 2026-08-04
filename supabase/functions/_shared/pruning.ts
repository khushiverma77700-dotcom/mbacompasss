// Shared helpers for the Content Pruning engine.
// Pure functions only — no network, no Deno APIs — so they are safe to import
// from every pruning edge function.

export const SITE_URL = "https://mbacompass.in";

export type PageType =
  | "college"
  | "institute"
  | "coaching-course"
  | "article"
  | "news"
  | "exam"
  | "category"
  | "city"
  | "course"
  | "compass-course"
  | "mock"
  | "static"
  | "other";

export type Recommendation =
  | "keep"
  | "update"
  | "merge"
  | "redirect"
  | "delete"
  | "noindex"
  | "canonical"
  | "rewrite"
  | "expand"
  | "refresh";

export const RECOMMENDATIONS: Recommendation[] = [
  "keep", "update", "merge", "redirect", "delete",
  "noindex", "canonical", "rewrite", "expand", "refresh",
];

export interface PruningPageInput {
  url: string;
  path: string;
  page_type: PageType;
  source_table: string | null;
  source_id: string | null;
  slug: string | null;
  page_name: string | null;
  state?: string | null;
  city?: string | null;
  author?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  h1?: string | null;
  word_count: number;
  heading_count: number;
  faq_count: number;
  has_schema: boolean;
  thin_content: boolean;
  readability: number | null;
  repetition_score: number | null;
  stale_facts: string[];
  published_at?: string | null;
  content_updated_at?: string | null;
  days_since_update: number | null;
  primary_keyword?: string | null;
  secondary_keyword?: string | null;
  internal_links_out: number;
  content_hash: string;
  shingles: string[];
  signals: Record<string, unknown>;
}

/* ------------------------------ text utilities ----------------------------- */

export const stripHtml = (html: unknown): string => {
  if (typeof html !== "string") return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/** Flatten any DB value (text, array, jsonb) into plain readable text. */
export const flattenText = (value: unknown, depth = 0): string => {
  if (value == null || depth > 4) return "";
  if (typeof value === "string") return stripHtml(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => flattenText(v, depth + 1)).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => flattenText(v, depth + 1))
      .join(" ");
  }
  return "";
};

export const wordCount = (text: string): number =>
  text ? text.split(/\s+/).filter(Boolean).length : 0;

export const headingCount = (html: unknown): number => {
  if (typeof html !== "string") return 0;
  return (html.match(/<h[2-6][\s>]/gi) || []).length;
};

export const countFaqs = (faq: unknown): number => {
  if (!faq) return 0;
  if (Array.isArray(faq)) return faq.length;
  if (typeof faq === "object") {
    const items = (faq as any).items;
    if (Array.isArray(items)) return items.length;
  }
  return 0;
};

/** Crude readability: shorter sentences + shorter words read easier (0-100). */
export const readabilityScore = (text: string): number | null => {
  if (!text) return null;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return null;
  const avgSentence = words.length / sentences.length;
  const avgWordLen = words.reduce((a, w) => a + w.length, 0) / words.length;
  const raw = 120 - avgSentence * 1.6 - avgWordLen * 6;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

/** Share of repeated 6-word phrases — high values suggest templated AI filler. */
export const repetitionScore = (text: string): number | null => {
  const words = normalizeWords(text);
  if (words.length < 60) return null;
  const grams = new Map<string, number>();
  for (let i = 0; i + 6 <= words.length; i++) {
    const g = words.slice(i, i + 6).join(" ");
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  let repeated = 0;
  for (const c of grams.values()) if (c > 1) repeated += c - 1;
  return Math.round((repeated / Math.max(1, grams.size)) * 1000) / 10;
};

const normalizeWords = (text: string): string[] =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/* ------------------------- duplication fingerprints ------------------------ */

export const hash32 = (s: string): string => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

/** Deterministic min-hash style sketch: 64 smallest 5-gram hashes. */
export const shingleSketch = (text: string, size = 64): string[] => {
  const words = normalizeWords(text);
  if (words.length < 8) return [];
  const set = new Set<string>();
  for (let i = 0; i + 5 <= words.length; i++) {
    set.add(hash32(words.slice(i, i + 5).join(" ")));
  }
  return Array.from(set).sort().slice(0, size);
};

export const jaccard = (a: string[] | null, b: string[] | null): number => {
  if (!a?.length || !b?.length) return 0;
  const sa = new Set(a);
  let inter = 0;
  for (const x of b) if (sa.has(x)) inter++;
  const union = sa.size + b.length - inter;
  return union ? inter / union : 0;
};

export const normalizeTitleKey = (s: unknown): string =>
  typeof s === "string" ? normalizeWords(s).join(" ") : "";

/* ---------------------------- freshness detection --------------------------- */

const YEAR_TOPICS = [
  { key: "fees", re: /\b(fee|fees|tuition)\b/i, label: "Fee figures" },
  { key: "cutoff", re: /\b(cut[\s-]?off|percentile)\b/i, label: "Cutoffs / percentiles" },
  { key: "placement", re: /\b(placement|package|ctc|salary)\b/i, label: "Placement numbers" },
  { key: "ranking", re: /\b(rank|ranking|nirf)\b/i, label: "Rankings" },
  { key: "admission", re: /\b(admission|application|registration|deadline|exam date)\b/i, label: "Admission process / dates" },
];

/**
 * Detect outdated sections: which topic-bearing sentences mention a year that
 * is at least two cycles behind the current one.
 */
export const detectStaleFacts = (text: string, now = new Date()): string[] => {
  if (!text) return [];
  const currentYear = now.getUTCFullYear();
  const out = new Set<string>();
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const years = (s.match(/\b(20[0-2]\d)\b/g) || []).map(Number);
    if (!years.length) continue;
    const newest = Math.max(...years);
    if (newest >= currentYear - 1) continue;
    for (const t of YEAR_TOPICS) {
      if (t.re.test(s)) out.add(`${t.label} referencing ${newest}`);
    }
    if (!YEAR_TOPICS.some((t) => t.re.test(s)) && newest <= currentYear - 3) {
      out.add(`Dated reference to ${newest}`);
    }
  }
  return Array.from(out).slice(0, 12);
};

export const daysSince = (d: string | null | undefined, now = new Date()): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.round((now.getTime() - t) / 86400000));
};

export const countLinks = (html: unknown): { total: number; internal: string[] } => {
  if (typeof html !== "string") return { total: 0, internal: [] };
  const hrefs = Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map((m) => m[1]);
  const internal = hrefs
    .filter((h) => h.startsWith("/") || h.includes("mbacompass.in"))
    .map((h) => {
      try {
        const u = h.startsWith("/") ? new URL(SITE_URL + h) : new URL(h);
        return u.pathname.replace(/\/$/, "") || "/";
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  return { total: hrefs.length, internal };
};

/* --------------------------------- scoring -------------------------------- */

export interface ScoreInput {
  word_count: number;
  heading_count: number;
  faq_count: number;
  has_schema: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  h1?: string | null;
  days_since_update: number | null;
  stale_facts: string[] | null;
  internal_links_in: number;
  internal_links_out: number;
  backlinks: number;
  clicks: number;
  impressions: number;
  avg_position: number | null;
  index_state?: string | null;
  psi_score?: number | null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const computeScores = (p: ScoreInput) => {
  // Content quality
  let content = 0;
  content += Math.min(45, (p.word_count / 900) * 45);
  content += Math.min(15, p.heading_count * 2.5);
  content += Math.min(10, p.faq_count * 2.5);
  content += p.has_schema ? 10 : 0;
  content += p.meta_title ? 5 : 0;
  content += p.meta_description ? 5 : 0;
  content += p.h1 ? 5 : 0;
  content += Math.min(5, p.internal_links_out);

  // Freshness
  const d = p.days_since_update;
  let freshness = d == null ? 40 : d <= 30 ? 100 : d <= 90 ? 85 : d <= 180 ? 70 : d <= 365 ? 50 : d <= 730 ? 30 : 15;
  freshness -= Math.min(35, (p.stale_facts?.length ?? 0) * 7);

  // Authority / internal linking
  let authority = 0;
  authority += Math.min(45, p.internal_links_in * 6);
  authority += Math.min(25, p.backlinks * 5);
  authority += Math.min(20, p.internal_links_out * 2);
  authority += p.internal_links_in > 0 ? 10 : 0;

  // Overall SEO health
  let seo = content * 0.35 + freshness * 0.2 + authority * 0.15;
  const perf = p.impressions > 0
    ? Math.min(100, (p.clicks / Math.max(1, p.impressions)) * 1500 + Math.min(60, p.impressions / 20))
    : 0;
  seo += perf * 0.2;
  if (p.index_state === "indexed") seo += 8;
  else if (p.index_state && p.index_state !== "unknown") seo -= 6;
  seo += p.psi_score != null ? (p.psi_score / 100) * 2 : 0;

  // Opportunity: lots of impressions but poor position / low CTR
  let opportunity = 0;
  if (p.impressions > 0) {
    const posGap = p.avg_position != null ? Math.max(0, Math.min(1, (p.avg_position - 3) / 27)) : 0.5;
    opportunity = Math.min(100, Math.log10(1 + p.impressions) * 22 * (0.4 + posGap));
  }

  return {
    content_score: clamp(content),
    freshness_score: clamp(freshness),
    authority_score: clamp(authority),
    seo_score: clamp(seo),
    opportunity_score: clamp(opportunity),
  };
};

/* ------------------------- heuristic recommendation ------------------------ */

export interface HeuristicContext extends ScoreInput {
  url: string;
  page_type: string;
  duplicate_of?: string | null;
  cannibal_urls?: string[];
  is_orphan?: boolean;
  seo_score: number;
  content_score: number;
  freshness_score: number;
  opportunity_score: number;
}

/**
 * Deterministic fallback / guardrail decision. The AI layer may override this,
 * but destructive outcomes always require these thresholds to be met too.
 */
export const heuristicDecision = (c: HeuristicContext): {
  recommendation: Recommendation;
  target_url: string | null;
  problem: string;
  reason: string;
  priority: "low" | "medium" | "high" | "critical";
} => {
  const noTraffic = c.clicks === 0 && c.impressions < 5;
  const veryThin = c.word_count < 180;

  if (c.duplicate_of) {
    return {
      recommendation: c.clicks > 0 ? "canonical" : "merge",
      target_url: c.duplicate_of,
      problem: "Duplicate or near-duplicate of another page",
      reason: `Content overlaps heavily with ${c.duplicate_of}, splitting relevance signals between two URLs.`,
      priority: "high",
    };
  }
  if (c.cannibal_urls?.length) {
    return {
      recommendation: "merge",
      target_url: c.cannibal_urls[0],
      problem: "Keyword cannibalization",
      reason: `Competes with ${c.cannibal_urls.join(", ")} for the same primary keyword and intent.`,
      priority: "high",
    };
  }
  if (veryThin && noTraffic) {
    return {
      recommendation: "delete",
      target_url: null,
      problem: "Thin page with no search demand",
      reason: `Only ${c.word_count} words, no clicks and negligible impressions — it consumes crawl budget without earning traffic.`,
      priority: "medium",
    };
  }
  if (veryThin) {
    return {
      recommendation: "expand",
      target_url: null,
      problem: "Thin content",
      reason: `Only ${c.word_count} words but the page already earns ${c.impressions} impressions, so depth should lift it.`,
      priority: "high",
    };
  }
  if ((c.stale_facts?.length ?? 0) > 0) {
    return {
      recommendation: "refresh",
      target_url: null,
      problem: "Outdated facts",
      reason: `Detected outdated sections: ${(c.stale_facts ?? []).slice(0, 3).join("; ")}.`,
      priority: c.clicks > 0 ? "high" : "medium",
    };
  }
  if (c.opportunity_score >= 55 && c.content_score < 70) {
    return {
      recommendation: "update",
      target_url: null,
      problem: "High demand, weak content",
      reason: `${c.impressions} impressions at average position ${c.avg_position ?? "n/a"} — improving depth and metadata should convert impressions into clicks.`,
      priority: "high",
    };
  }
  if (noTraffic && c.freshness_score < 40) {
    return {
      recommendation: "rewrite",
      target_url: null,
      problem: "Stale page with no traffic",
      reason: "No clicks, few impressions and no recent update — the page needs a rewrite or should be removed.",
      priority: "medium",
    };
  }
  if (c.is_orphan) {
    return {
      recommendation: "update",
      target_url: null,
      problem: "Orphan page",
      reason: "No internal links point to this page, so it receives little crawl priority or link equity.",
      priority: "medium",
    };
  }
  return {
    recommendation: "keep",
    target_url: null,
    problem: "None material",
    reason: "Content depth, freshness and search performance are all within healthy ranges.",
    priority: "low",
  };
};

/** Guardrail: never allow a destructive action on a page that earns traffic. */
export const isDestructive = (r: string) => r === "delete" || r === "redirect" || r === "merge";

export const violatesSafety = (r: string, c: { clicks: number; backlinks: number; impressions: number }) =>
  isDestructive(r) && (c.clicks >= 5 || c.backlinks > 0 || c.impressions >= 200);
