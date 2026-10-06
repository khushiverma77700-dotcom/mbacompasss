// Universal AI SEO master rules + final quality audit.
//
// The blog writer's base prompt is tuned for MBA/education topics. This module
// adds the topic-agnostic strategist layer (search intent, source priority,
// natural keyword use, Overview → Contents → body structure, tables, bolded data
// data, FAQs, links, schema, freshness) and a deterministic post-write audit so
// the admin can see what was satisfied before publishing.

export type TopicDomain = "mba" | "general";

const MBA_HINTS = [
  "mba", "cat ", "cat20", "cat 20", "xat", "nmat", "snap", "cmat", "iift", "micat", "gmat", "mat ",
  "iim", "isb", "xlri", "mdi", "spjimr", "nmims", "fms", "imt", "pgdm", "pgp", "b-school", "bschool",
  "business school", "management entrance", "gd-pi", "wat", "percentile", "admission", "placement",
  "college", "campus", "coaching", "exam", "syllabus", "cutoff", "cut-off", "shortlist",
];

/** Rough topic detection so niche rules only apply when the topic really is MBA/education. */
export function detectTopicDomain(...texts: (string | undefined | null)[]): TopicDomain {
  const blob = texts.filter(Boolean).join(" ").toLowerCase();
  if (!blob.trim()) return "mba";
  return MBA_HINTS.some((h) => blob.includes(h)) ? "mba" : "general";
}

export interface MasterRuleOptions {
  title: string;
  keyword: string;
  secondaryKeywords?: string[];
  domain: TopicDomain;
  /** True when the editor supplied reference URLs. */
  hasReferences?: boolean;
  todayIso?: string;
}

/**
 * Appended LAST in the system prompt, so it wins any earlier niche instruction
 * for non-MBA topics.
 */
export function seoMasterRules(opts: MasterRuleOptions): string {
  const today = opts.todayIso || new Date().toISOString().slice(0, 10);
  const secondary = (opts.secondaryKeywords || []).filter(Boolean);
  const generalOverride =
    opts.domain === "general"
      ? `
TOPIC OVERRIDE (HIGHEST PRIORITY — read before anything above):
- This topic is NOT about MBA, CAT, B-schools, admissions or education. Ignore every MBA-specific, exam-specific, college-specific, placement-specific and student-audience instruction above.
- Write for the real audience of "${opts.title}" in that topic's own industry vocabulary, with that industry's units, entities, regulators, price points and decision criteria.
- Do not mention MBA colleges, entrance exams, percentiles, placements, aspirants or students unless the topic itself is about them.
- Internal links: only use paths from the curated internal link pool. If no pooled path fits this topic, add no internal links rather than forcing an unrelated one.
- Skip the "About MBA Compass" brand section for this topic unless the topic is genuinely related to MBA, careers, exams or education.`
      : "";

  return `${generalOverride}

UNIVERSAL SEO STRATEGIST RULES (apply to every topic, every industry):

1. Search intent first. Before drafting, settle in your own head: the reader's literal question, the intent type (informational / commercial investigation / transactional / navigational / mixed), the audience, and what they must walk away knowing. Every section must serve that intent; anything else is filler and must be cut.

2. Source priority. ${opts.hasReferences ? "The editor's reference links are the first and highest source of truth — facts, figures, dates, fees, rankings, eligibility, definitions and processes come from them before anything else. Additional research is a supplement only, used when the reference pages do not cover a required point." : "Use only facts supplied in this prompt, the verified project data, and supplemental research explicitly provided. Nothing else may be presented as fact."} Prefer official sites, government sources, official reports and original data over secondary commentary. When sources disagree, prefer the most authoritative and current one and say plainly that figures differ where it affects the reader's decision.

3. Never fabricate. No invented statistics, dates, prices, fees, rankings, percentages, quotes, policies, eligibility rules, specifications or company facts. If a number is not verified, give a clearly labelled range or say the official figure is not yet confirmed. Never use placeholders like "XX" or "TBA-value". Never claim personal or hands-on experience you do not have.

4. Keyword use is natural, never mechanical. Primary keyword: "${opts.keyword}".${secondary.length ? ` Supporting keywords available: ${secondary.slice(0, 15).join(", ")}.` : ""} Place the primary keyword where it reads naturally — SEO title, H1, slug, first paragraph, Overview, at least one H2, meta description, conclusion, image alt — and use variations rather than repeating the exact phrase. Ignore any fixed keyword-density figure: there is no density target. If a keyword makes a sentence awkward, rewrite the sentence or drop the keyword. Self-check the draft for stuffing, near-duplicate sentences and over-optimisation, and rewrite anything that reads forced.

5. Structure. H1 (page handles it) → Overview → Table of Contents (generated automatically from your headings) → main sections → Important Points → FAQs → Conclusion. Include substantive paragraphs, at least one useful table where verified comparable data exists, and at least one focused list. Do not invent headings you never write about. Adapt sections to the actual intent instead of reusing one template.

6. Overview must be substantive. Directly answer the main query in the opening Overview block, with the specific facts, numbers and dates that matter. It must be useful even if the reader stops there. Start the intro with <p><strong>Overview:</strong> …</p>.

7. Answer early. If the query is about a price, fee, date, deadline, cutoff, eligibility rule, requirement or statistic, state that answer near the top, then explain the detail, then the context.

8. Tables for structured data. Any information that fits rows × columns becomes a <table>: prices, fees, dates, timelines, rankings, features, specifications, eligibility, comparisons, year-wise data. Keep tables short-celled, consistent in units, mobile-friendly (max 5-6 columns) and never decorative.

9. Format the facts. Bold important dates, deadlines, amounts, percentages, cutoffs, ranks, key numbers and critical takeaways. Never bold whole paragraphs or list items wholesale.

10. Depth over length. Cover the topic completely for its intent; do not pad to hit a word count and do not repeat yourself. Complete, accurate and useful beats long.

11. People-first. Clear, original, professional, natural language. No generic AI intros, no filler, no hype, no clickbait, no unsupported claims.

12. E-E-A-T. Show real analysis, cite sources by plain-text name, keep attribution accurate, and reflect the publication/updated date (${today}) for anything time-sensitive. Verify time-sensitive facts before stating them as current; label historical data as historical.

13. Links. Internal links only from the curated pool, with descriptive anchor text tied to the surrounding sentence — never "click here" or "read more", never over-linked. External sources are named in plain text, not as anchors.

14. FAQs. 6-12 genuine questions from real search behaviour, each with a useful, fact-based answer. No FAQ exists to hold a keyword.

15. Deliverables. Alongside the article, give an accurate SEO title, meta description, clean short slug (primary keyword, no keyword pile-up), image alt suggestions that describe the actual image, and only structured-data types the page honestly qualifies for.

16. Self-audit before returning: intent answered, Overview present and specific, main answer early, no fabricated facts, no stuffing, tables where data is comparable, important figures bolded, headings meaningful, FAQs genuine, links contextual, conclusion useful. Never use the standalone labels "Summary", "Key" or "Snapshot". Fix the content itself rather than adding keywords.

Never promise or imply search rankings anywhere in the output.`;
}

/* ------------------------------ Quality audit ------------------------------ */

export interface AuditCheck {
  area: string;
  label: string;
  status: "pass" | "warn";
  detail: string;
}

export interface QualityAudit {
  score: number;
  checks: AuditCheck[];
  intentType: string;
  primaryKeyword: string;
  stuffingRisk: "low" | "medium" | "high";
}

const textOf = (html: string) =>
  String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

const countMatches = (haystack: string, needle: string): number => {
  if (!needle) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (haystack.match(re) || []).length;
};

/** Infer the dominant search intent from the query wording. */
export function inferSearchIntent(keyword: string, title: string): string {
  const q = `${keyword} ${title}`.toLowerCase();
  if (/\b(buy|price|cost|fee|fees|discount|coupon|book|apply|register|enroll|subscribe|download)\b/.test(q)) {
    return "transactional / commercial";
  }
  if (/\b(best|top|vs|versus|compare|comparison|review|reviews|alternatives|which)\b/.test(q)) {
    return "commercial investigation";
  }
  if (/\b(login|official website|portal|dashboard|contact)\b/.test(q)) return "navigational";
  return "informational";
}

export interface AuditInput {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  keyword: string;
  secondaryKeywords?: string[];
  intro: string;
  content: string;
  faqCount?: number;
  tocEntries?: number;
  referenceCount?: number;
}

/**
 * Deterministic post-write audit. Every check is measured from the produced
 * HTML — nothing is assumed and nothing is scored by the model itself.
 */
export function buildQualityAudit(input: AuditInput): QualityAudit {
  const html = `${input.intro || ""}\n${input.content || ""}`;
  const plain = textOf(html);
  const words = plain.split(/\s+/).filter(Boolean).length;
  const kw = (input.keyword || "").trim();
  const kwCount = countMatches(plain, kw);
  const density = words > 0 && kw ? (kwCount * kw.split(/\s+/).length * 100) / words : 0;
  const checks: AuditCheck[] = [];

  const add = (area: string, label: string, ok: boolean, detail: string) =>
    checks.push({ area, label, status: ok ? "pass" : "warn", detail });

  // Structure
  const hasOverview = /<h2[^>]*>\s*overview\s*<\/h2>/i.test(html) || /<strong>\s*Overview\s*:?\s*<\/strong>/i.test(html);
  add("Content", "Overview block", hasOverview, hasOverview ? "Overview opens the article." : "No Overview block found at the top.");
  const toc = input.tocEntries ?? 0;
  add("Content", "Table of contents", toc >= 3, toc >= 3 ? `${toc} contents entries generated.` : "Too few headings for a table of contents.");
  const h2 = (html.match(/<h2\b/gi) || []).length;
  add("On-page SEO", "Heading structure", h2 >= 4, `${h2} H2 sections.`);
  const tables = (html.match(/<table\b/gi) || []).length;
  add("Content", "Data tables", tables >= 1, tables >= 1 ? `${tables} table(s) used for structured data.` : "No tables — check whether comparable data was written as prose.");
  const faqs = input.faqCount ?? (html.match(/<h3\b/gi) || []).length;
  add("Content", "FAQs", (input.faqCount ?? 0) >= 4, `${faqs} FAQ entries.`);
  const strongs = (html.match(/<strong\b/gi) || []).length;
  add("Readability", "Important facts highlighted", strongs >= 5, `${strongs} highlighted data points.`);

  // Early answer
  const firstChunk = textOf(input.intro || "").slice(0, 400);
  const answersEarly = /\d/.test(firstChunk) && firstChunk.length > 80;
  add("User experience", "Answer appears early", answersEarly, answersEarly ? "Opening block carries concrete facts." : "Opening block has no concrete figure — check it answers the query.");

  // Keyword handling
  add("Keywords", "Primary keyword present", kwCount > 0, kw ? `"${kw}" appears ${kwCount}x (${density.toFixed(1)}%).` : "No primary keyword supplied.");
  const stuffingRisk: QualityAudit["stuffingRisk"] = density > 3 ? "high" : density > 2 ? "medium" : "low";
  add("Keywords", "No keyword stuffing", stuffingRisk === "low", `Exact-match density ${density.toFixed(1)}% — ${stuffingRisk} risk.`);
  const secondaryHit = (input.secondaryKeywords || []).filter((k) => countMatches(plain, k) > 0).length;
  const secondaryTotal = (input.secondaryKeywords || []).length;
  add("Keywords", "Supporting keywords covered", secondaryTotal === 0 || secondaryHit > 0, secondaryTotal === 0 ? "No secondary keywords supplied." : `${secondaryHit}/${secondaryTotal} supporting keywords used naturally.`);

  // On-page
  const mt = (input.metaTitle || "").length;
  add("On-page SEO", "Meta title length", mt > 0 && mt <= 62, `${mt} characters.`);
  const md = (input.metaDescription || "").length;
  add("On-page SEO", "Meta description length", md >= 120 && md <= 170, `${md} characters.`);
  const slugLen = (input.slug || "").split("-").filter(Boolean).length;
  add("On-page SEO", "Clean slug", slugLen > 0 && slugLen <= 9, `${slugLen} slug words.`);
  const internal = (html.match(/<a\b[^>]*href="\/[^"]*"/gi) || []).length;
  add("Internal linking", "Contextual internal links", internal >= 3, `${internal} internal links.`);
  const genericAnchor = /<a\b[^>]*>\s*(click here|read more|learn more|here|this page)\s*<\/a>/i.test(html);
  add("Internal linking", "No generic anchors", !genericAnchor, genericAnchor ? "Generic anchor text found." : "All anchors are descriptive.");

  // Sourcing & freshness
  const refs = input.referenceCount ?? 0;
  add("Sources", "Reference-first research", refs > 0, refs > 0 ? `${refs} editor-supplied source(s) read first.` : "No reference links supplied — facts rest on verified project data only.");
  const placeholders = /\b(XX|TBD|lorem ipsum|\[insert)\b/i.test(plain);
  add("Accuracy", "No placeholders", !placeholders, placeholders ? "Placeholder text found — fix before publishing." : "No placeholder text.");

  // Readability
  const longParas = (html.match(/<p\b[^>]*>[\s\S]{520,}?<\/p>/gi) || []).length;
  add("Readability", "Short paragraphs", longParas === 0, longParas === 0 ? "No wall-of-text paragraphs." : `${longParas} very long paragraph(s).`);
  add("Content", "Depth for intent", words >= 900, `${words} words.`);

  const passes = checks.filter((c) => c.status === "pass").length;
  const score = checks.length ? Math.round((passes / checks.length) * 100) : 0;

  return {
    score,
    checks,
    intentType: inferSearchIntent(input.keyword, input.title),
    primaryKeyword: kw,
    stuffingRisk,
  };
}
