// Shared SEO Pipeline — single-primary-keyword workflow used by every AI
// content module. Any function that generates or optimizes SEO metadata
// SHOULD go through `runSeoPipeline` so the whole site follows the same rules:
//
//   Read page → Detect topic + search intent → Fetch top competitor(s)
//   → Keyword research → Pick 1 primary (+ 1 secondary only if same intent)
//   → Rewrite body if current content ≠ chosen keyword intent
//   → Regenerate: title, meta, H1, H2 outline, FAQ, JSON-LD, OG/Twitter,
//     canonical, ALT text, internal links, slug suggestion
//   → E-E-A-T + readability pass
//
// Every output MUST have exactly one primary_keyword. secondary_keyword is
// optional and MUST share the same search intent as the primary. Keyword
// stuffing and off-topic secondaries MUST be removed.

import { callAIGateway } from "./aiGateway.ts";
import { getCredential } from "./getCredential.ts";
import { firecrawlSearch } from "./firecrawlGateway.ts";

export interface PageContext {
  page_type: string;              // "college" | "course" | "institute" | "article" | "static" | ...
  url: string;                    // canonical URL
  title?: string;                 // current title
  description?: string;           // current meta description
  h1?: string;                    // current H1
  body_text?: string;             // current visible content (~2-8k chars)
  location?: { city?: string; state?: string };
  entities?: string[];            // eg institute name, exam name, brand
  intent_hint?: string;           // "informational" | "commercial" | "transactional" | "navigational"
  existing_primary_keyword?: string;
  extras?: Record<string, unknown>; // page-type-specific facts
}

export interface CompetitorSnapshot {
  url: string;
  title?: string;
  h1?: string;
  markdown?: string;
}

export interface SeoPipelineResult {
  primary_keyword: string;
  secondary_keyword?: string | null;
  search_intent: string;
  meta_title: string;              // 50-60 chars
  meta_description: string;        // 140-160 chars
  h1: string;                      // distinct from title
  outline: Array<{ level: "h2" | "h3"; text: string }>;
  intro_html: string;              // rewritten intro (100-180 words), primary KW in first 100 words
  body_html: string;               // full rewritten body (~800-1400 words), AEO/SEO/GEO friendly
  faq: Array<{ question: string; answer: string }>;
  json_ld: Record<string, unknown>;
  og_title: string;
  og_description: string;
  twitter_title: string;
  twitter_description: string;
  canonical_url: string;
  slug_suggestion?: string;
  alt_text_suggestions?: string[];
  internal_link_suggestions?: Array<{ anchor: string; url: string }>;
  long_tail_keywords: string[];    // 5-10 supporting long-tail keywords, each ≥ 3 words
  related_queries: string[];       // 5-10 real "People also ask" style queries
  keyword_density: Record<string, number>; // keyword -> % density in body_html (target 2.5-3.5% for primary)
  aeo_notes?: string;              // answer-engine optimization notes (schema, direct answers)
  geo_notes?: string;              // generative-engine optimization notes (entity coverage, citations)
  augment_html?: string;           // OPTIONAL additive block (quick answer + FAQ-ish + takeaways) — used in metadata mode instead of rewriting
  mode?: "metadata" | "full";
  rewrite_required: boolean;
  rewrite_reason?: string;
  keyword_stuffing_removed?: string[];
  eeat_notes?: string;
  readability_score?: number;
}

// ---------- Firecrawl helper (top competitor scrape) ----------

async function runFirecrawlSearch(query: string, limit = 3): Promise<CompetitorSnapshot[]> {
  const results = await firecrawlSearch({ query, limit, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } });
  return results.slice(0, limit).map((it) => ({
    url: it.url,
    title: it.title,
    h1: it.metadata?.title || it.title,
    markdown: (it.markdown || "").slice(0, 4000),
  }));
}

// ---------- Prompt builder ----------

function buildPrompt(ctx: PageContext, comps: CompetitorSnapshot[]): string {
  const year = new Date().getFullYear();
  const compBlock = comps.length
    ? comps.map((c, i) =>
        `Competitor ${i + 1}: ${c.url}\nTitle: ${c.title || ""}\nExcerpt: ${(c.markdown || "").slice(0, 1200)}`,
      ).join("\n---\n")
    : "(no competitor snapshots available; rely on the page context)";

  return `You are a senior on-page SEO + AEO + GEO strategist for MBA Compass (India). Optimize ONE page to become the best result for exactly ONE search query in Google India ${year} and in AI answer engines (Google AI Overviews, ChatGPT, Gemini, Perplexity, Copilot).

STRICT RULES — non-negotiable:
1. Pick exactly ONE primary_keyword. Add secondary_keyword ONLY IF it shares the SAME search intent and topic cluster. Otherwise return null.
2. If current content doesn't match the primary keyword's intent, set rewrite_required=true.
3. Remove keyword stuffing and off-topic secondary keywords. List them in keyword_stuffing_removed.
4. meta_title: 50-60 chars, primary keyword near the start, one power word (Best/Top/${year}/Guide) + qualifier. Distinct from h1.
5. meta_description: 140-160 chars, action-oriented, includes primary_keyword + genuine USP + CTA.
6. h1: single, distinct from meta_title, contains primary_keyword naturally.
7. outline: 5-9 H2s covering the topic in depth. Every heading answers a real sub-question.
8. intro_html: 100-180 words HTML, primary_keyword in first 100 words, definitional first sentence (AI-Overview friendly).
9. body_html: FULL rewritten body — 900-1400 words of clean HTML using <h2>, <h3>, <p>, <ul>, <ol>, <table> where useful. This is the content that will be published. Requirements:
   • Primary keyword density MUST be 2.5%-3.5% of total body words (count natural occurrences — no stuffing).
   • Include the secondary keyword 3-6 times naturally if present.
   • Each long_tail_keyword must appear at least once, woven naturally.
   • First 2-3 sentences of every H2 section directly answer the H2 as a question (AEO — Answer Engine Optimization).
   • Include a short "Quick answer" / TL;DR block near the top (40-60 words) that a generative engine can quote verbatim.
   • Include at least ONE comparison table OR bullet-list of concrete data (fees, dates, cutoffs, rankings) — real facts, no fabrication.
   • Cite authoritative Indian sources by name in text (e.g. "as per the official IIM CAT bulletin") for GEO trust.
   • Include entity mentions: exam bodies, cities, years, cohort sizes, so LLMs pick this up as an entity-rich page.
   • Sentences ≤ 22 words average. No fluff, no "In today's fast-paced world" openers.
   • End body_html with a short "Key takeaways" bullet list (3-5 bullets).
10. faq: 5-8 unique Q/A pairs (Q ≤ 90 chars, A 30-70 words) — real user questions, distinct from headings.
11. json_ld: ONE valid JSON-LD object with @context "https://schema.org" and correct @type (EducationalOrganization, Course, FAQPage, Article, etc.).
12. og_title/twitter_title ≈ 60 chars, og_description/twitter_description ≈ 140 chars, written differently from meta.
13. alt_text_suggestions: 3-6 realistic ALT strings including the primary keyword or entity, no stuffing.
14. internal_link_suggestions: 3-6 realistic anchors linking to related URLs on mbacompass.in.
15. long_tail_keywords: 5-10 supporting long-tail phrases (each ≥ 3 words) that share the primary intent — used inside body_html.
16. related_queries: 5-10 real "People also ask" style questions the target user actually types.
17. keyword_density: object mapping EACH keyword (primary + secondary + every long_tail) to its % density in body_html, computed as (occurrences × keyword_word_count / total_body_words) × 100, rounded to 1 decimal. Primary MUST be between 2.5 and 3.5.
18. aeo_notes: 1-3 sentences on how the page is optimized for answer engines (schema types used, direct-answer paragraphs, table/list blocks).
19. geo_notes: 1-3 sentences on generative-engine trust signals (named citations, entity coverage, factual specificity, freshness date).
20. E-E-A-T: mention author/source/updated-date signals in eeat_notes.

Return ONLY minified JSON, no commentary, matching this exact shape:
{"primary_keyword":"","secondary_keyword":null,"search_intent":"informational|commercial|transactional|navigational","meta_title":"","meta_description":"","h1":"","outline":[{"level":"h2","text":""}],"intro_html":"","body_html":"","faq":[{"question":"","answer":""}],"json_ld":{},"og_title":"","og_description":"","twitter_title":"","twitter_description":"","canonical_url":"","slug_suggestion":"","alt_text_suggestions":[],"internal_link_suggestions":[{"anchor":"","url":""}],"long_tail_keywords":[],"related_queries":[],"keyword_density":{},"aeo_notes":"","geo_notes":"","rewrite_required":false,"rewrite_reason":"","keyword_stuffing_removed":[],"eeat_notes":"","readability_score":0}

PAGE CONTEXT
URL: ${ctx.url}
Page type: ${ctx.page_type}
Current title: ${ctx.title || "(none)"}
Current meta description: ${ctx.description || "(none)"}
Current H1: ${ctx.h1 || "(none)"}
Existing primary keyword: ${ctx.existing_primary_keyword || "(none)"}
Location: ${ctx.location?.city || ""} ${ctx.location?.state || ""}
Entities: ${(ctx.entities || []).join(", ") || "(none)"}
Intent hint: ${ctx.intent_hint || "(auto-detect)"}
Extras: ${JSON.stringify(ctx.extras || {}).slice(0, 1200)}

CURRENT VISIBLE CONTENT (may be thin/off-topic):
${(ctx.body_text || "").slice(0, 3500)}

TOP GOOGLE RESULTS (search intent reference):
${compBlock}

Analyze search intent from URL + entities + current content + competitors first, choose ONE primary keyword with the best ranking opportunity, then produce the JSON with a full body_html that hits the 2.5-3.5% primary keyword density target.`;
}


// Credit-light prompt: NO full content rewrite. Only keyword research,
// metadata, schema, density plan and an OPTIONAL small additive block.
function buildMetadataPrompt(ctx: PageContext, comps: CompetitorSnapshot[]): string {
  const year = new Date().getFullYear();
  const compBlock = comps.length
    ? comps.map((c, i) => `Competitor ${i + 1}: ${c.url}\nTitle: ${c.title || ""}\nExcerpt: ${(c.markdown || "").slice(0, 700)}`).join("\n---\n")
    : "(no competitor snapshots)";
  const existing = (ctx.body_text || "").slice(0, 2500);
  const existingWords = existing.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  return `You are a senior on-page SEO + AEO + GEO strategist for MBA Compass (India), Google India ${year}.

CRITICAL: DO NOT rewrite or replace the existing page content. Keep it as-is. You only produce SEO layers: keyword research, metadata, schema markup, density plan, and (optionally) a SMALL additive block that is appended context — never a replacement.

DELIVER:
1. ONE primary_keyword (highest real search demand + ranking opportunity for this page). secondary_keyword only if it shares the SAME intent, else null.
2. long_tail_keywords: 6-10 long-tail phrases (>= 3 words) people actually search.
3. short_tail_keywords: 3-5 short head terms (1-2 words).
4. related_queries: 6-10 real "People also ask" questions.
5. meta_title 50-60 chars (primary KW near start), meta_description 140-160 chars, h1 distinct from title with primary KW.
6. json_ld: ONE valid schema.org object, correct @type, plus FAQPage entities where sensible.
7. faq: 5-8 Q/A pairs (A 30-60 words) — AEO direct answers.
8. augment_html: OPTIONAL, 120-320 words of clean HTML ONLY (h2/p/ul/table) to ADD to the page. Use it to (a) give a 40-60 word "Quick answer" a generative engine can quote, (b) naturally raise primary-keyword density above 3%, (c) add entity mentions (exam bodies, cities, ${year}) and a Key takeaways list. Never contradict or duplicate the existing content, never fabricate fees/dates/rankings — if a fact is unknown, omit it.
9. density_plan: how many additional natural occurrences of the primary keyword are needed so total density on the page (existing ${existingWords} words + augment) is >= 3% but <= 4%. Place those occurrences inside augment_html.
10. aeo_notes, geo_notes, eeat_notes: 1-2 sentences each.
11. alt_text_suggestions (3-6), internal_link_suggestions (3-6 on mbacompass.in).
12. rewrite_required MUST be false. body_html MUST be "".

Return ONLY minified JSON:
{"primary_keyword":"","secondary_keyword":null,"search_intent":"informational|commercial|transactional|navigational","meta_title":"","meta_description":"","h1":"","outline":[{"level":"h2","text":""}],"augment_html":"","body_html":"","faq":[{"question":"","answer":""}],"json_ld":{},"og_title":"","og_description":"","twitter_title":"","twitter_description":"","canonical_url":"","alt_text_suggestions":[],"internal_link_suggestions":[{"anchor":"","url":""}],"long_tail_keywords":[],"short_tail_keywords":[],"related_queries":[],"density_plan":"","aeo_notes":"","geo_notes":"","rewrite_required":false,"eeat_notes":"","readability_score":0}

PAGE CONTEXT
URL: ${ctx.url}
Page type: ${ctx.page_type}
Current title: ${ctx.title || "(none)"}
Current meta: ${ctx.description || "(none)"}
Current H1: ${ctx.h1 || "(none)"}
Existing primary keyword: ${ctx.existing_primary_keyword || "(none)"}
Location: ${ctx.location?.city || ""} ${ctx.location?.state || ""}
Entities: ${(ctx.entities || []).join(", ") || "(none)"}
Facts: ${JSON.stringify(ctx.extras || {}).slice(0, 800)}

EXISTING CONTENT (KEEP — do not rewrite, ${existingWords} words):
${existing}

TOP GOOGLE RESULTS (intent reference):
${compBlock}`;
}

// ---------- Parse & sanitize ----------

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function clampLen(s: string, min: number, max: number): string {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "").trim();
}

function sanitize(result: any, ctx: PageContext, mode: "metadata" | "full" = "full"): SeoPipelineResult {
  const out: SeoPipelineResult = {
    primary_keyword: String(result.primary_keyword || "").trim(),
    secondary_keyword: result.secondary_keyword ? String(result.secondary_keyword).trim() : null,
    search_intent: String(result.search_intent || "informational"),
    meta_title: clampLen(String(result.meta_title || ""), 30, 65),
    meta_description: clampLen(String(result.meta_description || ""), 100, 170),
    h1: String(result.h1 || "").trim(),
    outline: Array.isArray(result.outline) ? result.outline.slice(0, 10) : [],
    intro_html: String(result.intro_html || "").trim(),
    body_html: String(result.body_html || "").trim(),
    faq: Array.isArray(result.faq) ? result.faq.slice(0, 10) : [],
    json_ld: (result.json_ld && typeof result.json_ld === "object") ? result.json_ld : {},
    og_title: String(result.og_title || result.meta_title || "").slice(0, 70),
    og_description: String(result.og_description || result.meta_description || "").slice(0, 170),
    twitter_title: String(result.twitter_title || result.meta_title || "").slice(0, 70),
    twitter_description: String(result.twitter_description || result.meta_description || "").slice(0, 170),
    canonical_url: String(result.canonical_url || ctx.url),
    slug_suggestion: result.slug_suggestion ? String(result.slug_suggestion) : undefined,
    alt_text_suggestions: Array.isArray(result.alt_text_suggestions) ? result.alt_text_suggestions.slice(0, 8) : [],
    internal_link_suggestions: Array.isArray(result.internal_link_suggestions) ? result.internal_link_suggestions.slice(0, 8) : [],
    long_tail_keywords: Array.isArray(result.long_tail_keywords) ? result.long_tail_keywords.slice(0, 12).map((k: any) => String(k).trim()).filter(Boolean) : [],
    related_queries: Array.isArray(result.related_queries) ? result.related_queries.slice(0, 12).map((k: any) => String(k).trim()).filter(Boolean) : [],
    keyword_density: (result.keyword_density && typeof result.keyword_density === "object") ? result.keyword_density : {},
    aeo_notes: result.aeo_notes ? String(result.aeo_notes) : undefined,
    geo_notes: result.geo_notes ? String(result.geo_notes) : undefined,
    augment_html: String(result.augment_html || "").trim() || undefined,
    mode,
    rewrite_required: mode === "metadata" ? false : Boolean(result.rewrite_required),
    rewrite_reason: result.rewrite_reason ? String(result.rewrite_reason) : undefined,
    keyword_stuffing_removed: Array.isArray(result.keyword_stuffing_removed) ? result.keyword_stuffing_removed.slice(0, 20) : [],
    eeat_notes: result.eeat_notes ? String(result.eeat_notes) : undefined,
    readability_score: typeof result.readability_score === "number" ? result.readability_score : undefined,
  };

  // Recompute keyword_density for accuracy (LLM values often drift).
  // metadata mode: measure across existing page content + the additive block,
  // because the existing content is preserved and NOT rewritten.
  const densitySource = mode === "metadata"
    ? `${ctx.body_text || ""} ${out.augment_html || ""}`
    : out.body_html;
  const bodyText = densitySource.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const bodyWords = bodyText.split(/\s+/).filter(Boolean);
  const totalWords = bodyWords.length || 1;
  const lc = bodyText.toLowerCase();
  const measure = (kw: string): number => {
    if (!kw) return 0;
    const k = kw.toLowerCase().trim();
    if (!k) return 0;
    const kWords = k.split(/\s+/).length;
    let idx = 0, count = 0;
    while ((idx = lc.indexOf(k, idx)) !== -1) { count++; idx += k.length; }
    return Math.round(((count * kWords) / totalWords) * 1000) / 10;
  };
  const density: Record<string, number> = {};
  if (out.primary_keyword) density[out.primary_keyword] = measure(out.primary_keyword);
  if (out.secondary_keyword) density[out.secondary_keyword] = measure(out.secondary_keyword);
  for (const lt of out.long_tail_keywords) density[lt] = measure(lt);
  for (const st of (Array.isArray(result.short_tail_keywords) ? result.short_tail_keywords : [])) {
    const k = String(st).trim();
    if (k) density[k] = measure(k);
  }
  out.keyword_density = density;

  // Guardrails: reject the model's output if it snuck two unrelated keywords in.
  if (out.secondary_keyword) {
    const p = out.primary_keyword.toLowerCase();
    const s = out.secondary_keyword.toLowerCase();
    const pTokens = new Set(p.split(/\s+/).filter((t) => t.length > 3));
    const sTokens = new Set(s.split(/\s+/).filter((t) => t.length > 3));
    const overlap = [...pTokens].some((t) => sTokens.has(t));
    if (!overlap) out.secondary_keyword = null;
  }
  return out;
}

// ---------- Public entry ----------

export interface RunSeoPipelineOptions {
  feature: string;                 // caller tag for usage logs
  userId?: string | null;
  competitorLimit?: number;        // default 3
  model?: string;                  // default = flash-class
  // "metadata" (default) = advanced SEO layers only, no content rewrite, ~4x cheaper.
  // "full" = legacy full-body rewrite.
  mode?: "metadata" | "full";
  signal?: AbortSignal;
}

export async function runSeoPipeline(
  ctx: PageContext,
  opts: RunSeoPipelineOptions,
): Promise<{ result: SeoPipelineResult; competitors: CompetitorSnapshot[]; raw: string }> {
  const seedQuery = ctx.existing_primary_keyword
    || `${ctx.title || ctx.h1 || ""} ${ctx.location?.city || ""}`.trim()
    || ctx.url;

  const mode = opts.mode ?? "metadata";
  // Credit saving: metadata mode needs only 1 competitor snapshot for intent.
  const competitors = await runFirecrawlSearch(seedQuery, opts.competitorLimit ?? (mode === "metadata" ? 1 : 3));

  const prompt = mode === "metadata" ? buildMetadataPrompt(ctx, competitors) : buildPrompt(ctx, competitors);
  const resp = await callAIGateway(
    {
      model: opts.model || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a precise on-page SEO strategist. Reply with only valid minified JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: mode === "metadata" ? 2200 : 6500,
    },
    { feature: opts.feature, userId: opts.userId, purpose: "long", signal: opts.signal },
  );

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${txt.slice(0, 400)}`);
  }
  const j = await resp.json();
  const raw = j?.choices?.[0]?.message?.content || "";
  let parsed: any;
  try { parsed = JSON.parse(stripFences(raw)); }
  catch { throw new Error(`Pipeline JSON parse failed: ${raw.slice(0, 300)}`); }

  const result = sanitize(parsed, ctx, mode);
  if (!result.primary_keyword) throw new Error("Pipeline returned no primary_keyword");
  return { result, competitors, raw };
}
