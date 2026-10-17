/**
 * Central AEO / GEO schema builders.
 *
 * Goal: every public page ships a small, consistent JSON-LD graph that AI
 * answer engines (ChatGPT Search, Perplexity, Gemini, AI Overviews) can use to
 * (a) identify the entity, (b) extract the direct answer, and (c) attribute the
 * claim back to MBA Compass.
 *
 * The sitewide WebSite + Organization nodes already ship in index.html, so
 * these builders only reference them by @id instead of re-emitting them
 * (SEOHead strips duplicate Organization/WebSite nodes anyway).
 */

import { articleAttribution } from "./articleAttribution";
export const SITE_ORIGIN = "https://mbacompass.in";
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/** CSS selector of the answer-first block rendered by <AnswerBlock />. */
export const SPEAKABLE_SELECTOR = ["#answer-summary", "h1"];

const abs = (pathOrUrl?: string) => {
  if (!pathOrUrl) return undefined;
  try {
    const u = new URL(pathOrUrl, SITE_ORIGIN);
    return `${SITE_ORIGIN}${u.pathname}${u.search}`;
  } catch {
    return undefined;
  }
};

const clean = (v?: string | null) => {
  const s = (v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return s || undefined;
};

export type BreadcrumbItem = { name: string; url: string };

/**
 * WebPage node with speakable + isPartOf/publisher entity links.
 * Emit this on every page that also renders an <AnswerBlock />.
 */
export const buildWebPageSchema = (opts: {
  path: string;
  name: string;
  description?: string;
  dateModified?: string;
  datePublished?: string;
  primaryImage?: string;
  breadcrumbs?: BreadcrumbItem[];
  inLanguage?: string;
}) => {
  const url = abs(opts.path);
  const node: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url ? `${url}#webpage` : undefined,
    url,
    name: clean(opts.name),
    description: clean(opts.description),
    inLanguage: opts.inLanguage || "en-IN",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    datePublished: opts.datePublished || undefined,
    dateModified: opts.dateModified || opts.datePublished || undefined,
    primaryImageOfPage: opts.primaryImage ? { "@type": "ImageObject", url: opts.primaryImage } : undefined,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: SPEAKABLE_SELECTOR,
    },
  };
  if (opts.breadcrumbs?.length && url) {
    node.breadcrumb = { "@id": `${url}#breadcrumb` };
  }
  return stripUndefined(node);
};

/** BreadcrumbList with a stable @id so WebPage.breadcrumb can point at it. */
export const buildBreadcrumbSchema = (path: string, items: BreadcrumbItem[]) => {
  const url = abs(path);
  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": url ? `${url}#breadcrumb` : undefined,
    itemListElement: [{ name: "Home", url: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: clean(item.name),
      item: abs(item.url),
    })),
  });
};

/**
 * Article / BlogPosting with a real Person author, machine-readable dates and
 * an answer-first speakable region. GEO engines lean on author + dates when
 * deciding whether a page is citable.
 */
export const buildArticleSchema = (article: {
  slug: string;
  title: string;
  h1_tag?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  excerpt?: string | null;
  author?: string | null;
  author_slug?: string | null;
  created_at?: string;
  updated_at?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  category?: string | null;
  keywords?: string[] | null;
  content?: string | null;
  preparedWordCount?: number;
}) => {
  const path = `/article/${article.slug}`;
  const url = abs(path) ?? `${SITE_ORIGIN}${path}`;
  const words = article.preparedWordCount ?? (article.content || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  const author = articleAttribution(clean(article.author));
  return stripUndefined({
    "@context": "https://schema.org",
    "@type": article.category?.toLowerCase() === "news" ? "NewsArticle" : "Article",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    headline: (clean(article.meta_title) || clean(article.h1_tag) || clean(article.title) || "").slice(0, 110),
    alternativeHeadline: clean(article.title),
    description: clean(article.meta_description) || clean(article.excerpt),
    articleSection: clean(article.category),
    wordCount: words || undefined,
    inLanguage: "en-IN",
    author: {
      "@type": author.type,
      name: author.name,
      ...(author.type === "Person" ? { jobTitle: author.role } : {}),
      url: author.url ? abs(author.url) : undefined,
    },
    publisher: { "@id": ORGANIZATION_ID },
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    image: article.banner_url || article.image_url || undefined,
    keywords: (article.keywords || []).filter(Boolean).slice(0, 10).join(", ") || undefined,
    isAccessibleForFree: true,
    speakable: { "@type": "SpeakableSpecification", cssSelector: SPEAKABLE_SELECTOR },
  });
};

/**
 * A compact "direct answer" node. AI engines match Question/Answer pairs far
 * more reliably than free prose, so the answer-first block on each page is
 * mirrored into schema as a single-question FAQ-style QAPage entity.
 */
export const buildDirectAnswerSchema = (opts: { path: string; question: string; answer: string }) => {
  const q = clean(opts.question);
  const a = clean(opts.answer);
  if (!q || !a || a.length < 40) return null;
  const url = abs(opts.path);
  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "Question",
    "@id": url ? `${url}#direct-answer` : undefined,
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  });
};

/**
 * Definition-style key facts, mirrored so engines can lift individual values.
 * Dataset is a Google rich-result type that REQUIRES name + description, so a
 * description is always emitted (falling back to a summary of the facts).
 */
export const buildKeyFactsSchema = (opts: {
  path: string;
  name: string;
  facts: { label: string; value: string }[];
  description?: string;
}) => {
  const facts = (opts.facts || []).filter((f) => clean(f.label) && clean(f.value)).slice(0, 12);
  if (!facts.length) return null;
  const url = abs(opts.path);
  const entity = clean(opts.name) || "This page";
  const factSummary = facts.map((f) => `${clean(f.label)}: ${clean(f.value)}`).join(". ");
  const description =
    clean(opts.description) ||
    `Verified key facts for ${entity} on MBA Compass. ${factSummary}.`;
  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": url ? `${url}#key-facts` : undefined,
    url,
    name: `${entity} — key facts`,
    description,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    creator: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    variableMeasured: facts.map((f) => ({
      "@type": "PropertyValue",
      name: clean(f.label),
      value: clean(f.value),
    })),
  });
};


/** ItemList for listing/hub pages so engines can enumerate the entities. */
export const buildItemListSchema = (opts: {
  path: string;
  name: string;
  items: { name: string; url: string; description?: string }[];
}) => {
  const items = (opts.items || []).filter((i) => clean(i.name) && i.url).slice(0, 25);
  if (!items.length) return null;
  const url = abs(opts.path);
  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": url ? `${url}#itemlist` : undefined,
    name: clean(opts.name),
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: clean(item.name),
      description: clean(item.description),
      url: abs(item.url),
    })),
  });
};

/**
 * Deduplicate + prune a page graph before handing it to SEOHead.
 * Removes falsy nodes, collapses repeated singleton types (FAQPage,
 * BreadcrumbList, WebPage) and drops nodes with a duplicate @id.
 */
const SINGLETON_TYPES = new Set(["FAQPage", "BreadcrumbList", "WebPage", "QAPage"]);

export const buildPageGraph = (...nodes: any[]) => {
  const flat = nodes.flat(3).filter(Boolean);
  const seenType = new Set<string>();
  const seenId = new Set<string>();
  const out: any[] = [];
  for (const node of flat) {
    if (!node || typeof node !== "object") continue;
    const type = Array.isArray(node["@type"]) ? node["@type"].join("|") : String(node["@type"] || "");
    const id = node["@id"] ? String(node["@id"]) : "";
    if (id && seenId.has(id)) continue;
    if (type && SINGLETON_TYPES.has(type)) {
      if (seenType.has(type)) continue;
      seenType.add(type);
    }
    if (id) seenId.add(id);
    out.push(node);
  }
  return out;
};

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk).filter((x) => x !== undefined);
    if (v && typeof v === "object") {
      const next: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        const w = walk(val);
        if (w !== undefined && w !== null && w !== "") next[k] = w;
      }
      return next;
    }
    return v;
  };
  return walk(obj);
}

/**
 * Build a 40–60 word direct answer from whatever content the page already has.
 * No AI call — deterministic, so it works during prerender too.
 */
export const deriveDirectAnswer = (...candidates: (string | null | undefined)[]) => {
  for (const c of candidates) {
    const text = clean(c);
    if (!text || text.length < 60) continue;
    // Take whole sentences up to ~360 chars so the answer never truncates mid-word.
    const sentences = text.split(/(?<=[.!?])\s+/);
    let out = "";
    for (const s of sentences) {
      if ((out + " " + s).trim().length > 360 && out.length >= 90) break;
      out = (out + " " + s).trim();
    }
    if (out.length >= 60) return out;
  }
  return undefined;
};
