// AEO / GEO canonical rulebook + deterministic compliance scorer.
//
// Every AI content generator on the platform appends AEO_GEO_RULES to its
// prompt, and every generator/audit path can score its output with
// scoreAeoGeo() before saving. This is the single source of truth for
// "what does AI-search-ready content look like on MBA Compass".
//
// AEO = Answer Engine Optimization (ChatGPT Search, Perplexity, AI Overviews).
// GEO = Generative Engine Optimization (being the cited source, not just a hit).

export const AEO_GEO_RULES = `

# AEO / GEO — AI SEARCH OPTIMIZATION (MANDATORY, applies to every output)

Your output is read by three audiences, in this order: (1) answer engines that
must be able to lift a self-contained answer, (2) an MBA aspirant skimming on a
phone, (3) Google's crawler. Structure for extraction, not for word count.

## 1. ANSWER-FIRST STRUCTURE (non-negotiable)
- The FIRST element of the body must be a direct-answer paragraph of 40-60 words
  that fully answers the page's primary question on its own, with no
  "in this article we will…" preamble. Write it as:
  <p><strong>Summary:</strong> …40-60 words…</p>
- The answer must be self-contained: repeat the entity name, the year and the
  key number inside it, so an engine quoting only that paragraph is still correct.
- Immediately after it, add a "key facts" block as a real definition list or a
  2-column table with 4-6 rows (fees, dates, eligibility, location, mode,
  cutoff band — whichever apply). One fact per row, value first, no prose.

## 2. QUESTION-SHAPED HEADINGS
- Use H2/H3 headings phrased the way aspirants actually search: "What is the CAT
  2026 exam fee?", "Who is eligible for XLRI BM?", "How much does an IIM MBA cost?"
- Every H2 section must open with a 1-2 sentence direct answer BEFORE any
  explanation, so each section is independently extractable.
- Exactly one H1 per page (the page shell supplies it — never emit an <h1>).
- Never skip heading levels: H2 → H3 → H4 only, in order.

## 3. SEMANTIC, MACHINE-READABLE HTML
- Allowed tags only: h2, h3, h4, p, ul, ol, li, strong, em, table, thead, tbody,
  tr, th, td, dl, dt, dd, blockquote, figure, figcaption, time.
- Use <table> with <thead> and <th scope="col"> for ANY comparative or numeric
  data (fees, dates, cutoffs, placements). Never fake a table with bullets.
- Wrap every date in <time datetime="YYYY-MM-DD">…</time> when the exact date is
  officially confirmed; otherwise write the expected month in plain text.
- No inline styles, no class attributes, no <div>, no <script>, no external links.

## 4. FACT DENSITY AND SPECIFICITY (this is what gets you cited)
- Every claim carries a number, a date, a name or a range. Vague sentences are
  rejected. "Fees are high" is wrong; "Total fees are ₹23-25 lakh for the 2-year
  programme" is right.
- Include the year in every time-sensitive statement ("CAT 2026", "2025-26 cycle").
- Prefer absolute values over relative ones ("₹2.4 lakh", not "affordable").
- State units and currency explicitly (₹ lakh, percentile, months, seats).
- If a fact is not confirmed in the provided context, say it is expected/TBA.
  Never invent a number to make the page look complete.

## 5. TRUST AND ATTRIBUTION SIGNALS (GEO)
- Name the source type for high-risk numbers in plain text (NIRF, official
  admission notice, placement report) using the [src:Name Year] marker.
- Where an official cycle is in progress, say plainly what is confirmed and what
  is still awaited. Explicit uncertainty raises citation trust; fake certainty
  destroys it.
- Add a short "Who this is for" or "What to do next" line in practical sections
  so the page demonstrates first-hand usefulness, not just aggregation.

## 6. FAQ BLOCK
- End with 5-8 FAQs. Each question must be a real long-tail query in the
  aspirant's own words. Each answer: 40-70 words, direct answer in the FIRST
  sentence, then at most one sentence of context. No cross-references
  ("as mentioned above") — every answer stands alone.

## 7. ENTITY CLARITY
- Use the full official entity name on first mention, then the common short form
  ("Indian Institute of Management Ahmedabad (IIM Ahmedabad)").
- Disambiguate look-alike entities explicitly (IIM Mumbai vs NITIE, MBA vs PGDM,
  XAT vs CAT) — engines conflate them, so state the difference in one sentence.
- Link related on-site entities with descriptive anchor text (exam → colleges
  accepting it, college → its city hub, article → the relevant tool). Internal
  links only.

## 8. SCANNABILITY
- Paragraphs max 3 sentences. No wall-of-text sections.
- Bold the key number or verdict in each section, once — not decoratively.
- Sections of 80-200 words each, in the order an aspirant needs them
  (what → eligibility → dates → fees → process → outcome → FAQs).
`;

export type AeoCheck = {
  id: string;
  label: string;
  weight: number;
  passed: boolean;
  detail?: string;
};

export type AeoScore = {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D";
  passed: AeoCheck[];
  failed: AeoCheck[];
  /** Short, prompt-ready instruction list for fixing the failures. */
  fixInstructions: string;
};

const textOf = (html: string) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const firstParagraph = (html: string) => {
  const m = (html || "").match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return m ? textOf(m[1]) : "";
};

/**
 * Deterministic AEO/GEO compliance score for a block of generated HTML.
 * No AI call — safe to run on every save, in audits and in bulk sweeps.
 */
export function scoreAeoGeo(
  html: string,
  opts: { entityName?: string; requireFaq?: boolean } = {},
): AeoScore {
  const raw = html || "";
  const text = textOf(raw);
  const words = text ? text.split(/\s+/).length : 0;
  const headings = [...raw.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const headingTexts = headings.map((h) => textOf(h[2]));
  const lead = firstParagraph(raw);
  const leadWords = lead ? lead.split(/\s+/).length : 0;

  const checks: AeoCheck[] = [
    {
      id: "answer_first",
      label: "Opens with a 40-60 word self-contained direct answer",
      weight: 18,
      passed: leadWords >= 30 && leadWords <= 110 && !/^(in this (article|guide|post))/i.test(lead),
      detail: `lead paragraph is ${leadWords} words`,
    },
    {
      id: "summary_label",
      label: 'Direct answer is labelled "Summary:"',
      weight: 6,
      passed: /<strong>\s*Summary\s*:?\s*<\/strong>|<h2[^>]*>\s*Summary\s*<\/h2>/i.test(raw),
    },
    {
      id: "key_facts",
      label: "Key-facts block present (definition list or 2-column table)",
      weight: 12,
      passed: /<dl[\s>]/i.test(raw) || /<table[\s>]/i.test(raw),
    },
    {
      id: "question_headings",
      label: "At least 3 question-shaped H2/H3 headings",
      weight: 12,
      passed:
        headingTexts.filter((h) => /\?$/.test(h) || /^(what|how|who|when|where|why|which|is|are|can|should|does|do)\b/i.test(h))
          .length >= 3,
      detail: `${headingTexts.length} headings found`,
    },
    {
      id: "heading_order",
      label: "No skipped heading levels and no in-body H1",
      weight: 8,
      passed: (() => {
        if (/<h1[\s>]/i.test(raw)) return false;
        let prev = 1;
        for (const h of headings) {
          const lvl = Number(h[1]);
          if (lvl > prev + 1) return false;
          prev = lvl;
        }
        return true;
      })(),
    },
    {
      id: "semantic_html",
      label: "Semantic HTML only (no div/inline styles/scripts)",
      weight: 8,
      passed: !/<div[\s>]|style\s*=|<script/i.test(raw),
    },
    {
      id: "table_semantics",
      label: "Tables use header cells",
      weight: 6,
      passed: !/<table[\s>]/i.test(raw) || /<th[\s>]/i.test(raw),
    },
    {
      id: "fact_density",
      label: "Fact-dense: numbers, dates and currency present",
      weight: 12,
      passed: (() => {
        const numbers = (text.match(/\d/g) || []).length;
        const hasYear = /\b20\d{2}\b/.test(text);
        const hasUnit = /(₹|lakh|crore|percentile|%|months?|seats?)/i.test(text);
        return words > 0 && numbers / Math.max(words, 1) > 0.02 && hasYear && hasUnit;
      })(),
    },
    {
      id: "entity_named",
      label: "Primary entity named in the direct answer",
      weight: 6,
      passed: !opts.entityName
        ? true
        : lead.toLowerCase().includes(String(opts.entityName).toLowerCase().split(/\s+/)[0] || ""),
    },
    {
      id: "faq",
      label: "FAQ block with 5+ questions",
      weight: 8,
      passed: opts.requireFaq === false
        ? true
        : headingTexts.filter((h) => /\?$/.test(h)).length >= 5 ||
          /<h2[^>]*>\s*(FAQs?|Frequently Asked Questions)/i.test(raw),
    },
    {
      id: "scannable",
      label: "Short paragraphs (no wall of text)",
      weight: 4,
      passed: [...raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .every((p) => textOf(p[1]).split(/\s+/).length <= 120),
    },
  ];

  const passed = checks.filter((c) => c.passed);
  const failed = checks.filter((c) => !c.passed);
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = passed.reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / total) * 100);

  return {
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D",
    passed,
    failed,
    fixInstructions: failed.length
      ? [
          "Rewrite the content to fix these AEO/GEO failures without removing any correct fact:",
          ...failed.map((f) => `- ${f.label}${f.detail ? ` (currently: ${f.detail})` : ""}`),
        ].join("\n")
      : "",
  };
}
