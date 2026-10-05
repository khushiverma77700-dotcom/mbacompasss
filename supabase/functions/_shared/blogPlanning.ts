// Phase 1-4 of the AI Blog Writer pipeline:
// understand the title + intent, build a strict topic boundary, and learn a
// style profile from sample blogs (style only — sample text is never handed
// to the writer, so nothing can be copied).

import { callAIGateway } from "./aiGateway.ts";
import { firecrawlScrape, firecrawlConfigured } from "./firecrawlGateway.ts";

export interface TopicBoundary {
  mustInclude: string[];
  canInclude: string[];
  mustNotInclude: string[];
  /** Exact named entities (colleges, exams, programmes) the article may name. Empty = no named-entity restriction derived. */
  allowedEntities: string[];
}

export interface StyleProfile {
  tone: string;
  paragraphLength: string;
  headingPattern: string;
  introStyle: string;
  tableUsage: string;
  sentenceStyle: string;
  detailLevel: string;
  examples: string;
  formatting: string;
}

export interface BlogAnalysis {
  searchIntent: string;
  articleType: string;
  readerQuestion: string;
  boundary: TopicBoundary;
  recommendedStructure: string[];
  timeSensitive: boolean;
  timeSensitiveTopics: string[];
  style: StyleProfile | null;
  sampleCount: number;
}

/** Phrases that make copy read machine-written. Shared by writer + editor. */
export const BANNED_PHRASES = [
  "in today's competitive landscape", "in today's fast-paced world", "in today's digital age",
  "it is important to note", "it's important to note", "it is worth noting", "it's worth noting",
  "let's dive in", "let's dive into", "dive into", "deep dive", "delve", "delves", "delving",
  "in conclusion", "to sum up", "in summary", "key summary", "quick snapshot", "snapshot",
  "key takeaways", "key highlights", "unlock", "unlocking", "comprehensive guide", "whether you are",
  "whether you're", "navigate the", "navigating", "landscape", "elevate", "game-changer",
  "cutting-edge", "world-class", "robust", "leverage", "seamless", "holistic", "tapestry",
  "testament to", "plays a pivotal role", "plays a crucial role", "a myriad of", "plethora",
  "first and foremost", "needless to say", "rest assured", "embark on", "ever-evolving",
  "look no further", "harness the power", "at the end of the day", "moreover", "furthermore",
];

const SAMPLE_CHARS = 6000;

async function readSamples(samples: unknown): Promise<string[]> {
  const list = (Array.isArray(samples) ? samples : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 5);
  const out: string[] = [];
  for (const item of list) {
    if (/^https?:\/\/\S+$/i.test(item)) {
      if (!firecrawlConfigured()) continue;
      const payload = await firecrawlScrape(item, ["markdown"]).catch(() => null);
      const body = payload?.data || payload || {};
      const text = String(body.markdown || "").trim();
      if (text.length > 300) out.push(text.slice(0, SAMPLE_CHARS));
    } else if (item.length > 200) {
      out.push(item.replace(/<[^>]+>/g, " ").slice(0, SAMPLE_CHARS));
    }
  }
  return out;
}

export async function analyzeBlogBrief(opts: {
  title: string;
  keyword: string;
  secondaryKeywords?: string[];
  audience?: string;
  searchIntent?: string;
  instructions?: string;
  sampleBlogs?: unknown;
  sourceDigest?: string;
}): Promise<BlogAnalysis> {
  const samples = await readSamples(opts.sampleBlogs);
  const fallback: BlogAnalysis = {
    searchIntent: opts.searchIntent || "informational",
    articleType: "guide",
    readerQuestion: opts.title,
    boundary: { mustInclude: [opts.keyword], canInclude: [], mustNotInclude: ["Unrelated colleges, exams or statistics"], allowedEntities: [] },
    recommendedStructure: [],
    timeSensitive: /\b(20\d\d|fee|fees|deadline|date|cutoff|placement|ranking|eligibility)\b/i.test(`${opts.title} ${opts.keyword}`),
    timeSensitiveTopics: [],
    style: null,
    sampleCount: samples.length,
  };

  const strList = { type: "array", items: { type: "string" } };
  const styleProps = ["tone", "paragraphLength", "headingPattern", "introStyle", "tableUsage", "sentenceStyle", "detailLevel", "examples", "formatting"];
  const parameters = {
    type: "object",
    additionalProperties: false,
    properties: {
      searchIntent: { type: "string" },
      articleType: { type: "string" },
      readerQuestion: { type: "string" },
      mustInclude: strList,
      canInclude: strList,
      mustNotInclude: strList,
      allowedEntities: strList,
      recommendedStructure: strList,
      timeSensitive: { type: "boolean" },
      timeSensitiveTopics: strList,
      style: {
        type: ["object", "null"],
        additionalProperties: false,
        properties: Object.fromEntries(styleProps.map((p) => [p, { type: "string" }])),
        required: styleProps,
      },
    },
    required: ["searchIntent", "articleType", "readerQuestion", "mustInclude", "canInclude", "mustNotInclude", "allowedEntities", "recommendedStructure", "timeSensitive", "timeSensitiveTopics", "style"],
  };

  const user = `Blog title: ${opts.title}
Primary keyword: ${opts.keyword}
Secondary keywords: ${(opts.secondaryKeywords || []).join(", ") || "none"}
Target audience: ${opts.audience || "not specified"}
Editor-selected search intent: ${opts.searchIntent || "auto-detect"}
Additional instructions: ${opts.instructions || "none"}
${opts.sourceDigest ? `\nReference material headings/excerpt (for scope only):\n${opts.sourceDigest.slice(0, 3000)}` : ""}

Tasks:
1. Detect search intent (informational / comparison / navigational / transactional / commercial investigation) and article type.
2. Write the single reader question this article must answer.
3. Build a strict topic boundary:
   - mustInclude: points directly required to answer the title.
   - canInclude: closely related context that genuinely helps this reader.
   - mustNotInclude: specific things the writer will be tempted to add but must not (e.g. for "IIM Fees 2027 – Compare Fees of All 22 IIMs": XLRI, SPJIMR, MDI, NMIMS, IIFT, non-IIM colleges, generic CAT prep advice).
   - allowedEntities: when the title defines a closed set (e.g. "all 22 IIMs"), list every member by its standard name. Otherwise list only entities named in the title/instructions. Never pad.
4. recommendedStructure: an ordered list of section types that suits THIS intent (do not force a fixed template).
5. timeSensitive + timeSensitiveTopics: which facts change by year (fees, dates, cutoffs, placements, rankings, eligibility).
6. style: ${samples.length ? "describe the writing style of the SAMPLE BLOGS below (tone, paragraph length, heading pattern, intro style, table usage, sentence style, level of detail, use of examples, formatting). Describe patterns only — never quote sentences." : "null (no samples supplied)."}
${samples.map((s, i) => `\n--- SAMPLE BLOG ${i + 1} (style reference only) ---\n${s}`).join("\n")}`;

  try {
    const response = await callAIGateway({
      model: "openai/gpt-5-mini",
      max_tokens: 3000,
      messages: [
        { role: "system", content: "You are a senior SEO editor and researcher for an Indian MBA education publisher. You scope articles precisely and never pad topics." },
        { role: "user", content: user },
      ],
      tools: [{ type: "function", function: { name: "scope_article", description: "Return intent, topic boundary and style profile.", parameters } }],
      tool_choice: { type: "function", function: { name: "scope_article" } },
    }, { feature: "ai-blog-writer-scope", maxRetries: 0, purpose: "long" });
    if (!response.ok) throw new Error(`scope ${response.status}`);
    const j = await response.json();
    const raw = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const a = JSON.parse(raw || "{}");
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 40) : []);
    return {
      searchIntent: opts.searchIntent || String(a.searchIntent || fallback.searchIntent),
      articleType: String(a.articleType || fallback.articleType),
      readerQuestion: String(a.readerQuestion || opts.title),
      boundary: {
        mustInclude: arr(a.mustInclude),
        canInclude: arr(a.canInclude),
        mustNotInclude: arr(a.mustNotInclude),
        allowedEntities: arr(a.allowedEntities),
      },
      recommendedStructure: arr(a.recommendedStructure),
      timeSensitive: !!a.timeSensitive,
      timeSensitiveTopics: arr(a.timeSensitiveTopics),
      style: samples.length && a.style ? a.style as StyleProfile : null,
      sampleCount: samples.length,
    };
  } catch (e) {
    console.warn("[blogPlanning] analysis failed, using fallback", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export function analysisPromptBlock(a?: BlogAnalysis | null, extra?: { audience?: string; instructions?: string }): string {
  if (!a) return "";
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- (none)");
  return `

## ARTICLE SCOPE (STRICT — overrides every other rule)
Search intent: ${a.searchIntent} · Article type: ${a.articleType}
Reader question to answer: ${a.readerQuestion}
${extra?.audience ? `Target audience: ${extra.audience}\n` : ""}${extra?.instructions ? `Editor instructions (follow exactly): ${extra.instructions}\n` : ""}
MUST INCLUDE:
${list(a.boundary.mustInclude)}
CAN INCLUDE (only where it genuinely helps):
${list(a.boundary.canInclude)}
MUST NOT INCLUDE:
${list(a.boundary.mustNotInclude)}
${a.boundary.allowedEntities.length ? `ALLOWED NAMED ENTITIES — name ONLY these colleges/exams/programmes; naming any other institution is an error:\n${a.boundary.allowedEntities.join(", ")}\n` : ""}${a.recommendedStructure.length ? `Suggested structure for this intent: ${a.recommendedStructure.join(" → ")}\n` : ""}${a.timeSensitive ? `TIME-SENSITIVE facts (${a.timeSensitiveTopics.join(", ") || "fees, dates, cutoffs"}): use only figures from the supplied sources; where a figure is not supplied, say it should be confirmed on the official website instead of guessing.\n` : ""}${a.style ? `
## WRITING STYLE (learned from editor samples — imitate patterns, never wording)
Tone: ${a.style.tone}
Paragraph length: ${a.style.paragraphLength}
Headings: ${a.style.headingPattern}
Intro: ${a.style.introStyle}
Tables: ${a.style.tableUsage}
Sentences: ${a.style.sentenceStyle}
Detail: ${a.style.detailLevel}
Examples: ${a.style.examples}
Formatting: ${a.style.formatting}
` : ""}
Accuracy > word count. Relevance > length. Readability > keyword density. If you don't know, don't invent.`;
}
