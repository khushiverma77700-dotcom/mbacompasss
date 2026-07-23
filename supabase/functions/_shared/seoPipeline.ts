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
  rewrite_required: boolean;       // true when current content did not match chosen KW intent
  rewrite_reason?: string;
  keyword_stuffing_removed?: string[];
  eeat_notes?: string;
  readability_score?: number;       // 0-100 self-assessed
}

// ---------- Firecrawl helper (top competitor scrape) ----------

async function firecrawlSearch(query: string, limit = 3): Promise<CompetitorSnapshot[]> {
  const key = await getCredential("FIRECRAWL_API_KEY").catch(() => null);
  if (!key) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const items = (j?.data || []) as any[];
    return items.slice(0, limit).map((it) => ({
      url: it.url,
      title: it.title,
      h1: it.metadata?.title,
      markdown: (it.markdown || "").slice(0, 4000),
    }));
  } catch { return []; }
}

// ---------- Prompt builder ----------

function buildPrompt(ctx: PageContext, comps: CompetitorSnapshot[]): string {
  const year = new Date().getFullYear();
  const compBlock = comps.length
    ? comps.map((c, i) =>
        `Competitor ${i + 1}: ${c.url}\nTitle: ${c.title || ""}\nExcerpt: ${(c.markdown || "").slice(0, 1200)}`,
      ).join("\n---\n")
    : "(no competitor snapshots available; rely on the page context)";

  return `You are a senior on-page SEO strategist for MBA Compass (India). Optimize ONE page to become the best result for exactly ONE search query in Google India ${year} and in AI answer engines (Google AI Overviews, ChatGPT, Gemini, Perplexity).

STRICT RULES — non-negotiable:
1. Pick exactly ONE primary_keyword. Add secondary_keyword ONLY IF it shares the SAME search intent and topic cluster as primary. Otherwise return null for secondary_keyword.
2. NEVER pack multiple unrelated keyword categories into one page. If the current content doesn't match the primary keyword's intent, set rewrite_required=true and REWRITE the intro_html so the topic actually matches.
3. Remove keyword stuffing and off-topic secondary keywords. List what you removed in keyword_stuffing_removed.
4. meta_title: 50-60 characters, primary keyword near the start, one power word (Best/Top/2026/Free/Guide) + a qualifier (year/exam/city). Distinct from h1.
5. meta_description: 140-160 characters, action-oriented, includes primary_keyword + a genuine USP + CTA.
6. h1: single, distinct from meta_title, contains primary_keyword naturally.
7. Outline: 4-8 H2s that cover the topic in depth (skip H3s unless truly needed). Every heading answers a real sub-question a searcher has.
8. intro_html: 100-180 words, HTML string, primary_keyword in the first 100 words, definitional first sentence (great for AI Overviews), no fluff, no brand-first opening.
9. faq: 5-8 unique question/answer pairs (Q ≤ 90 chars, A 30-70 words) — real questions users ask, not restated headings.
10. json_ld: ONE valid JSON-LD object with @context "https://schema.org" and @type matching the page. Include Breadcrumbs only if URL implies a hierarchy.
11. og_title/twitter_title ≈ 60 chars, og_description/twitter_description ≈ 140 chars, written differently from meta.
12. alt_text_suggestions: 3-6 realistic ALT strings for hero/inline images that include the primary keyword or an entity, NEVER stuffed.
13. internal_link_suggestions: 3-6 anchors that would help this page rank, drawn from natural related topics. Use realistic URLs on mbacompass.in.
14. E-E-A-T: mention which experience/expertise signals the page should show (author, sources, updated date) in eeat_notes.
15. Optimize for AI search: first paragraph must answer "What is X?" clearly, use natural semantic entities, keep sentences ≤ 22 words on average.

Return ONLY minified JSON, no commentary, matching this exact shape:
{"primary_keyword":"","secondary_keyword":null,"search_intent":"informational|commercial|transactional|navigational","meta_title":"","meta_description":"","h1":"","outline":[{"level":"h2","text":""}],"intro_html":"","faq":[{"question":"","answer":""}],"json_ld":{},"og_title":"","og_description":"","twitter_title":"","twitter_description":"","canonical_url":"","slug_suggestion":"","alt_text_suggestions":[],"internal_link_suggestions":[{"anchor":"","url":""}],"rewrite_required":false,"rewrite_reason":"","keyword_stuffing_removed":[],"eeat_notes":"","readability_score":0}

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

Analyze search intent from URL + entities + current content + competitors first, choose ONE primary keyword with the highest ranking opportunity, then produce the JSON.`;
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

function sanitize(result: any, ctx: PageContext): SeoPipelineResult {
  const out: SeoPipelineResult = {
    primary_keyword: String(result.primary_keyword || "").trim(),
    secondary_keyword: result.secondary_keyword ? String(result.secondary_keyword).trim() : null,
    search_intent: String(result.search_intent || "informational"),
    meta_title: clampLen(String(result.meta_title || ""), 30, 65),
    meta_description: clampLen(String(result.meta_description || ""), 100, 170),
    h1: String(result.h1 || "").trim(),
    outline: Array.isArray(result.outline) ? result.outline.slice(0, 10) : [],
    intro_html: String(result.intro_html || "").trim(),
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
    rewrite_required: Boolean(result.rewrite_required),
    rewrite_reason: result.rewrite_reason ? String(result.rewrite_reason) : undefined,
    keyword_stuffing_removed: Array.isArray(result.keyword_stuffing_removed) ? result.keyword_stuffing_removed.slice(0, 20) : [],
    eeat_notes: result.eeat_notes ? String(result.eeat_notes) : undefined,
    readability_score: typeof result.readability_score === "number" ? result.readability_score : undefined,
  };

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
  signal?: AbortSignal;
}

export async function runSeoPipeline(
  ctx: PageContext,
  opts: RunSeoPipelineOptions,
): Promise<{ result: SeoPipelineResult; competitors: CompetitorSnapshot[]; raw: string }> {
  const seedQuery = ctx.existing_primary_keyword
    || `${ctx.title || ctx.h1 || ""} ${ctx.location?.city || ""}`.trim()
    || ctx.url;

  const competitors = await firecrawlSearch(seedQuery, opts.competitorLimit ?? 3);

  const prompt = buildPrompt(ctx, competitors);
  const resp = await callAIGateway(
    {
      model: opts.model || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a precise on-page SEO strategist. Reply with only valid minified JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 3000,
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

  const result = sanitize(parsed, ctx);
  if (!result.primary_keyword) throw new Error("Pipeline returned no primary_keyword");
  return { result, competitors, raw };
}
