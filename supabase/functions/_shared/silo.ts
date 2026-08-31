// Shared helpers for the Reverse Siloing engine.
// Pure functions + source configuration only — no network, no Deno APIs.

export const SITE_URL = "https://mbacompass.in";

export type SiloPageType =
  | "college" | "institute" | "coaching-course" | "article" | "exam"
  | "category" | "city" | "course" | "compass-course" | "static" | "other";

/** Pages that exist to convert. These are the reverse-siloing link TARGETS. */
export const COMMERCIAL_TYPES: SiloPageType[] = [
  "course", "compass-course", "coaching-course", "institute",
];

export interface SiloPageInput {
  url: string;
  path: string;
  page_type: SiloPageType;
  source_table: string | null;
  source_id: string | null;
  source_field: string | null;
  slug: string | null;
  page_name: string | null;
  topic: string | null;
  primary_keyword: string | null;
  word_count: number;
  is_commercial: boolean;
  links_out: number;
  signals: Record<string, unknown>;
}

export interface SiloEdge {
  from_path: string;
  to_path: string;
  anchor_text: string | null;
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

export const toSlug = (s: string): string =>
  (s || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const normalizePath = (href: string): string => {
  try {
    const u = href.startsWith("/") ? new URL(SITE_URL + href) : new URL(href);
    if (!u.hostname.includes("mbacompass.in")) return "";
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
};

/** Extract every internal <a> as an edge with its anchor text. */
export const extractLinks = (html: unknown): { path: string; anchor: string }[] => {
  if (typeof html !== "string" || !html.includes("<a")) return [];
  const out: { path: string; anchor: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    if (!href.startsWith("/") && !href.includes("mbacompass.in")) continue;
    const path = normalizePath(href);
    if (!path) continue;
    out.push({ path, anchor: stripHtml(m[2]).slice(0, 160) });
  }
  return out;
};

/* --------------------------------- PageRank -------------------------------- */

/**
 * Weighted internal PageRank over the link graph.
 * Damping 0.85, dangling mass redistributed uniformly (Google's formulation).
 */
export const pageRank = (
  paths: string[],
  edges: { from_path: string; to_path: string }[],
  opts: { damping?: number; iterations?: number } = {},
): Map<string, number> => {
  const damping = opts.damping ?? 0.85;
  const iterations = opts.iterations ?? 25;
  const n = paths.length;
  const rank = new Map<string, number>();
  if (!n) return rank;

  const index = new Map<string, number>();
  paths.forEach((p, i) => index.set(p, i));

  const outDeg = new Float64Array(n);
  const inbound: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const a = index.get(e.from_path);
    const b = index.get(e.to_path);
    if (a === undefined || b === undefined || a === b) continue;
    outDeg[a] += 1;
    inbound[b].push(a);
  }

  let pr = new Float64Array(n).fill(1 / n);
  for (let it = 0; it < iterations; it++) {
    const next = new Float64Array(n);
    let dangling = 0;
    for (let i = 0; i < n; i++) if (outDeg[i] === 0) dangling += pr[i];
    const base = (1 - damping) / n + (damping * dangling) / n;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const j of inbound[i]) sum += pr[j] / outDeg[j];
      next[i] = base + damping * sum;
    }
    pr = next;
  }

  // Normalize to a 0-100 authority scale against the strongest page.
  let max = 0;
  for (let i = 0; i < n; i++) if (pr[i] > max) max = pr[i];
  paths.forEach((p, i) => rank.set(p, max ? pr[i] / max : 0));
  return rank;
};

/** Unique anchor phrases / total inbound links (0-1). Low = spammy repetition. */
export const anchorDiversity = (anchors: string[]): number | null => {
  const clean = anchors.map((a) => (a || "").toLowerCase().trim()).filter(Boolean);
  if (!clean.length) return null;
  return Math.round((new Set(clean).size / clean.length) * 100) / 100;
};

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/* ------------------------------ source config ------------------------------ */
// `field` is the HTML column a contextual link may be inserted into.

export interface SiloSource {
  name: string;
  page_type: SiloPageType;
  table: string;
  columns: string;
  field: string;              // editable HTML column
  pathFor: (row: any, ctx: Record<string, any>) => string | null;
  nameFor: (row: any) => string | null;
  htmlFor: (row: any) => unknown[];
  textFor?: (row: any) => unknown[];
  keywordFor?: (row: any) => string | null;
  topicFor?: (row: any) => string | null;
  filter?: (q: any) => any;
  range?: [number, number];
}

export const SILO_SOURCES: SiloSource[] = [
  {
    name: "colleges",
    page_type: "college",
    table: "colleges",
    columns: "id, slug, name, description, admission_process, cutoff_info, primary_keyword, city, state, tier, meta_title, meta_description, h1_tag",
    field: "description",
    pathFor: (c) => (c.slug ? `/college/${c.slug}` : null),
    nameFor: (c) => c.name,
    htmlFor: (c) => [c.description, c.admission_process, c.cutoff_info],
    keywordFor: (c) => c.primary_keyword,
    topicFor: (c) => [c.name, c.city, c.state].filter(Boolean).join(" · ") || null,
  },
  {
    name: "institutes",
    page_type: "institute",
    table: "institutes",
    columns: "id, slug, name, description, primary_keyword, city, state, meta_title, meta_description, h1_tag",
    field: "description",
    pathFor: (i) => (i.slug ? `/institute/${i.slug}` : null),
    nameFor: (i) => i.name,
    htmlFor: (i) => [i.description],
    keywordFor: (i) => i.primary_keyword,
    topicFor: (i) => [i.name, i.city].filter(Boolean).join(" · ") || null,
  },
  {
    name: "articles",
    page_type: "article",
    table: "articles",
    columns: "id, slug, title, excerpt, intro, content, primary_keyword, category, meta_title, meta_description, h1_tag",
    field: "content",
    pathFor: (a) => (a.slug ? `/article/${a.slug}` : null),
    nameFor: (a) => a.title,
    htmlFor: (a) => [a.intro, a.content],
    textFor: (a) => [a.excerpt],
    keywordFor: (a) => a.primary_keyword,
    topicFor: (a) => a.category ?? null,
    filter: (q) => q.eq("published", true),
  },
  {
    name: "exams",
    page_type: "exam",
    table: "exams",
    columns: "id, slug, name, description, eligibility, pattern, primary_keyword, meta_title, meta_description, h1_tag",
    field: "description",
    pathFor: (e) => (e.slug ? `/exam/${e.slug}` : null),
    nameFor: (e) => e.name,
    htmlFor: (e) => [e.description],
    textFor: (e) => [e.eligibility, e.pattern],
    keywordFor: (e) => e.primary_keyword,
    topicFor: (e) => e.name ?? null,
  },
  {
    name: "categories",
    page_type: "category",
    table: "categories",
    columns: "id, slug, name, description",
    field: "description",
    pathFor: (c) => (c.slug ? `/category/${c.slug}` : null),
    nameFor: (c) => c.name,
    htmlFor: (c) => [c.description],
    topicFor: (c) => c.name ?? null,
  },
  {
    name: "city-pages",
    page_type: "city",
    table: "city_pages",
    columns: "id, slug, name, state, intro_content, detailed_content, primary_keyword, meta_title, meta_description, h1_tag",
    field: "detailed_content",
    pathFor: (c) => (c.slug ? `/colleges/${c.slug}` : null),
    nameFor: (c) => c.name,
    htmlFor: (c) => [c.intro_content, c.detailed_content],
    keywordFor: (c) => c.primary_keyword,
    topicFor: (c) => [c.name, c.state].filter(Boolean).join(" · ") || null,
    filter: (q) => q.eq("active", true),
  },
  {
    name: "mock-bundles",
    page_type: "course",
    table: "mock_bundles",
    columns: "id, slug, name, description, features, highlights",
    field: "description",
    pathFor: (b) => (b.slug ? `/courses/${b.slug}` : null),
    nameFor: (b) => b.name,
    htmlFor: (b) => [b.description],
    textFor: (b) => [b.features, b.highlights],
    topicFor: (b) => b.name ?? null,
    filter: (q) => q.eq("is_published", true),
  },
  {
    name: "compass-courses",
    page_type: "compass-course",
    table: "mba_compass_courses",
    columns: "id, slug, title, subtitle, description, curriculum, primary_keyword, meta_title, meta_description, h1_tag",
    field: "description",
    pathFor: (c) => (c.slug ? `/mba-compass/${c.slug}` : null),
    nameFor: (c) => c.title,
    htmlFor: (c) => [c.description],
    textFor: (c) => [c.subtitle, c.curriculum],
    keywordFor: (c) => c.primary_keyword,
    topicFor: (c) => c.title ?? null,
    filter: (q) => q.eq("is_active", true),
  },
];

/* ---------------------------- link insertion ------------------------------ */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface InsertResult {
  html: string;
  mode: "wrapped" | "appended";
  snippet: string;
}

/**
 * Insert a contextual internal link into an HTML body.
 *
 * Preferred mode wraps an existing occurrence of `anchor` that is NOT already
 * inside an <a> tag or a heading. If the phrase does not exist, a short
 * contextual sentence is appended so the link is still editorial, never a
 * bare "related links" dump.
 */
export const insertContextualLink = (
  html: string,
  anchor: string,
  href: string,
  fallbackSentence?: string,
): InsertResult | null => {
  const source = typeof html === "string" ? html : "";
  const phrase = (anchor || "").trim();
  if (!phrase) return null;

  if (source.includes(`href="${href}"`) || source.includes(`href='${href}'`)) return null;

  if (source) {
    const re = new RegExp(escapeRe(phrase), "i");
    // Only consider matches inside plain text: split on tags and rebuild.
    const parts = source.split(/(<[^>]+>)/g);
    let inAnchor = false;
    let inHeading = false;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("<")) {
        const tag = part.toLowerCase();
        if (/^<a\b/.test(tag)) inAnchor = true;
        else if (/^<\/a>/.test(tag)) inAnchor = false;
        else if (/^<h[1-6]\b/.test(tag)) inHeading = true;
        else if (/^<\/h[1-6]>/.test(tag)) inHeading = false;
        continue;
      }
      if (inAnchor || inHeading) continue;
      const m = part.match(re);
      if (!m || m.index === undefined) continue;
      const matched = part.slice(m.index, m.index + phrase.length);
      parts[i] =
        part.slice(0, m.index) +
        `<a href="${href}">${matched}</a>` +
        part.slice(m.index + phrase.length);
      const plain = stripHtml(part);
      return { html: parts.join(""), mode: "wrapped", snippet: plain.slice(0, 240) };
    }
  }

  const sentence = (fallbackSentence || `Explore our ${phrase} for a structured next step.`).trim();
  const withLink = sentence.replace(
    new RegExp(escapeRe(phrase), "i"),
    `<a href="${href}">${phrase}</a>`,
  );
  const para = `<p>${withLink.includes("<a ") ? withLink : `<a href="${href}">${phrase}</a> — ${sentence}`}</p>`;
  return { html: `${source}\n${para}`, mode: "appended", snippet: stripHtml(para).slice(0, 240) };
};

/** Remove a previously inserted link, restoring the stored original HTML. */
export const revertPayloadFor = (field: string, before: string) => ({ field, before });
