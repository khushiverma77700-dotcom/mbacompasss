// AI Exam Writer — generates a complete, modular exam page payload from just
// an exam name + year. Research is grounded on the official exam / conducting
// body domain via Firecrawl; anything unconfirmed is left blank so the public
// template hides that module instead of showing "TBA".
//
// POST body:
//   { exam_name, exam_year, official_website?, exam_category?, notes?,
//     batches?: ("core"|"exam"|"outcomes"|"discovery")[],  // default: all
//     research?: { sources, notes }                        // reuse prior research
//   }
// Response: { sections, sources, tokens_used, research }
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { MBA_COMPASS_SECTION_RULES } from "../_shared/aiContentRules.ts";
import { firecrawlSearch, firecrawlScrape } from "../_shared/firecrawlGateway.ts";
import {
  auditExamSections,
  gapsByBatch,
  pruneBlankContent,
  type Gap,
} from "../_shared/examCompleteness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-worker-key",
};

const MODEL = "gpt-5-mini";

export type BatchName = "core" | "exam" | "outcomes" | "discovery";

const BATCH_KEYS: Record<BatchName, string[]> = {
  core: ["hero", "quick_answer", "highlights", "dates", "overview", "eligibility", "registration", "fees", "fees_notes"],
  exam: ["pattern", "marking", "syllabus", "resources", "papers", "difficulty", "preparation", "tools"],
  outcomes: ["cutoffs", "colleges", "comparisons", "counselling", "admit_card", "exam_day", "centres", "result", "after_exam"],
  discovery: ["related_exams", "related_searches", "updates", "faqs", "seo"],
};

const SHAPES: Record<BatchName, string> = {
  core: `{
  "hero": { "full_form": string, "tagline": string, "exam_category": string, "exam_level": string, "exam_mode": string, "frequency": string, "duration": string, "conducting_body": string, "official_website": string, "registration_status": string, "exam_status": string },
  "quick_answer": [ { "q": string, "a": string } ],            // 8-10 items, answers 2-3 sentences
  "highlights": [ { "label": string, "value": string } ],       // 10-14 factual cards
  "dates": [ { "event": string, "date": string, "status": string, "notes": string } ],  // 10-14 events
  "overview": string,                                            // HTML: 7-10 blocks (<h3> + <p>/<ul>), 700+ words, exam-specific
  "eligibility": { "summary": string /*HTML, 3-5 paragraphs*/, "criteria": [ { "label": string, "value": string } ], "can_i_apply": [ { "q": string, "a": string } ] },
  "registration": { "steps": [ { "title": string, "detail": string } ], "documents": [string], "notes": string /*HTML: photo/signature specs, correction window, common mistakes*/ },
  "fees": [ { "category": string, "fee": string, "notes": string } ],  // MANDATORY: one row per candidate category (General, OBC-NCL, EWS, SC, ST, PwD, Female/Transgender where applicable), plus rows for late fee, per-additional-programme fee, international/overseas centre fee and GST when applicable
  "fees_notes": string                                            // HTML: accepted payment modes (net banking / UPI / debit / credit), refund & non-refundable policy, payment-failure handling, fee-waiver rules
}`,
  exam: `{
  "pattern": { "columns": [string], "rows": [[string]], "notes": string /*HTML*/ },
  "marking": [ { "label": string, "value": string } ],
  "syllabus": [ { "subject": string, "topics": [ { "name": string, "subtopics": [string] } ] } ],
  "resources": [ { "label": string, "url": string } ],           // official PDFs / notifications only
  "papers": [ { "year": string, "paper_url": string, "solutions_url": string, "difficulty": string } ],
  "difficulty": { "columns": [string], "rows": [[string]] },
  "preparation": [ { "title": string, "body_html": string } ],   // only modules relevant to this exam
  "tools": [ { "label": string, "url": string, "description": string } ]
}`,
  outcomes: `{
  "cutoffs": { "columns": [string], "rows": [[string]], "notes": string /*HTML*/ },
  "colleges": [ { "name": string, "location": string, "course": string, "cutoff": string, "fees": string, "outcome": string } ],
  "comparisons": [ { "a": string, "b": string, "points": [ { "parameter": string, "a_value": string, "b_value": string } ] } ],
  "counselling": { "steps": [ { "title": string, "detail": string } ], "notes": string /*HTML*/ },
  "admit_card": string /*HTML*/,
  "exam_day": { "before": [string], "at_centre": [string], "not_allowed": [string] },
  "centres": [ { "city": string, "state": string, "availability": string } ],
  "result": { "html": string, "link": string },
  "after_exam": string /*HTML*/
}`,
  discovery: `{
  "related_exams": [ { "name": string, "why": string } ],
  "related_searches": [string],
  "updates": [ { "date": string, "headline": string, "summary": string, "source_url": string } ],
  "faqs": [ { "category": string, "q": string, "a": string } ],   // 20-30 genuinely useful questions
  "seo": { "meta_title": string, "meta_description": string, "h1": string, "primary_keyword": string, "keywords": [string] }
}`,
};

function baseRules(examName: string, year: number | null) {
  const label = `${examName}${year ? ` ${year}` : ""}`;
  return `You are a senior MBA/competitive-exam editor at MBA Compass (a B School Buzz product) writing the definitive page for ${label}.

ACCURACY RULES (non-negotiable):
- Use ONLY facts you can support from the OFFICIAL RESEARCH provided below or from well-established, verifiable official information about this exam.
- NEVER invent dates, fees, cutoffs, marks, links or counts. If a value is not confirmed, return an EMPTY STRING for it or omit the item entirely — the page hides empty modules.
- NEVER write placeholders like "TBA", "To be announced", "N/A", "coming soon", "approx.", "—", "XX".
- Every URL must be an official domain (exam authority, conducting body, official counselling authority). No third-party links.
- Indian currency as "INR 2,500" style. Dates as "12 Nov 2026" or "Nov 2026" when only the month is confirmed.

COMPLETENESS RULES (equally important):
- Aim to fill EVERY field in the requested shape. An empty field is acceptable ONLY when the fact is genuinely unverifiable — never because it takes effort.
- Where an exact figure is unconfirmed but the structure is stable year to year (exam pattern, marking scheme, syllabus topics, eligibility norms, registration steps, documents, exam-day rules, counselling flow, preparation guidance), write the full, exam-specific detail — these are not date-dependent facts.
- Respect minimum depth: highlights 10-14 cards, quick_answer 8-10 Q&As, dates 10-14 events, syllabus every subject with topics AND subtopics, registration 8-12 steps, documents 8-12 items, faqs 25-35 questions, eligibility criteria 8-12 rows, preparation 7-10 blocks (each 120+ words), colleges 12-20 institutions, centres 20-40 cities, papers up to 5 recent years, updates 5-10 items, comparisons 2-4 blocks.
- FEES ARE MANDATORY. Never return an empty fees array. Give a row for EVERY candidate category the authority publishes (General, OBC-NCL, EWS, SC, ST, PwD, and any female/transgender concession), plus late fee, per-additional-programme fee, overseas-centre fee and GST rows when they exist. Always write fees_notes covering payment modes, refund policy and payment-failure handling — these are stable policy facts, not date-dependent guesses.
- FEE VALUES: every fees row MUST carry a real published amount in the "fee" field (e.g. "INR 2,500"). A blank, dashed, "TBA", "as applicable" or "varies" fee value is FORBIDDEN — if you cannot confirm the amount for a category from the official notification, DROP THAT ROW ENTIRELY instead of returning an empty value. The same rule applies to every table cell and every "value" field on the page: a real value, or no row at all.
- This page must be genuinely content-rich: every prose module needs a direct answer, then specifics (numbers, sections, marks, timings, named entities, worked examples). No module may be a single thin sentence.
- highlights: keep each "value" SHORT and scannable (under ~60 characters, no explanatory clauses in brackets). Put long explanations in the relevant prose module instead. For portal/website/helpdesk cards, the value must be the bare URL, email or phone only.

EXAM-NAME ANCHORING (critical for topical strength):
- The exact exam name "${label}" (and the short form "${examName}") must appear repeatedly and naturally across the whole page: in EVERY <h3> heading of every HTML block, in the first sentence of every prose module, in every FAQ question or answer, in the eligibility summary, registration notes, fees notes, admit-card, exam-day, result and after-exam blocks.
- Aim for roughly 2-3% keyword density on "${examName}" across the page — dense enough to be unmistakably about this exam, never in awkward or repeated boilerplate sentences. Vary the phrasing: "${label}", "${examName} exam", "the ${examName} paper", "${examName} aspirants", "${examName} registration", "${examName} syllabus".
- Never write generic sentences like "This exam is conducted every year" — always name the exam: "${label} is conducted every year by …".

SEO / AEO / GEO RULES:
- SEO: use the exam's real search vocabulary naturally — "${label} exam date", "${label} eligibility", "${label} syllabus", "${label} registration", "${label} cutoff", "${label} exam pattern" — in headings and the first sentence of each block. No keyword stuffing.
- AEO: start every HTML block and every FAQ answer with a direct, self-contained 1-2 sentence answer that names ${label}, then expand. Answers must make sense when quoted alone by a voice assistant or featured snippet.
- GEO: write extractable, citation-friendly statements — one fact per sentence, named entities spelled in full on first use (conducting body, institute names, portal names), explicit numbers and units, and no vague pronouns. Prefer lists and tables over long paragraphs so LLMs can lift the facts cleanly.
- Each HTML field: clean semantic HTML only (<p>, <h3>, <ul>, <li>, <strong>, <table>). No inline styles, no <script>, no links to non-official sites.
- Write for Indian aspirants, mentor tone, specific and useful — no filler.

Return STRICT JSON matching the requested shape. Every key in the shape MUST be present. No markdown fences, no commentary.`;
}

// ---- Completeness: field-level audit shared with the backfill worker --------
const wordCount = (html: unknown) =>
  typeof html === "string" ? html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length : 0;

/**
 * Gaps for the keys owned by `batch`, audited FIELD by FIELD — a fees table
 * with rows whose "fee" cell is empty counts as a gap, which the old
 * length-only check missed.
 */
function findGapDetails(batch: BatchName, data: Record<string, any>): Gap[] {
  const owned = new Set(BATCH_KEYS[batch]);
  return auditExamSections(data).filter((g) => owned.has(g.key));
}

function findGaps(batch: BatchName, data: Record<string, any>): string[] {
  return [...new Set(findGapDetails(batch, data).map((g) => g.key))];
}



async function research(examName: string, year: number | null, site?: string) {
  const label = `${examName}${year ? ` ${year}` : ""}`;
  const sources: { title: string; url: string }[] = [];
  const chunks: string[] = [];

  try {
    const domain = site ? site.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
    const queries = [
      domain
        ? `site:${domain} ${label} notification eligibility exam pattern registration dates`
        : `${label} official notification eligibility exam pattern registration dates`,
      `${label} official syllabus marking scheme sectional time limit`,
      `${label} application fee admit card exam day guidelines test centres`,
      `${label} cutoff percentile participating institutes counselling process result`,
    ];
    for (const q of queries) {
      const results = await firecrawlSearch({
        query: q,
        limit: 4,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      });
      for (const r of results) {
        if (!r.url) continue;
        sources.push({ title: r.title || r.url, url: r.url });
        const md = (r.markdown || r.description || "").slice(0, 6000);
        if (md) chunks.push(`SOURCE: ${r.url}\n${md}`);
      }
    }
  } catch (e) {
    console.warn("[ai-exam-writer] search failed", e);
  }

  if (site) {
    try {
      const scraped = await firecrawlScrape(site, ["markdown"]);
      const md = (scraped?.markdown || scraped?.data?.markdown || "").slice(0, 8000);
      if (md) {
        chunks.push(`SOURCE (official site): ${site}\n${md}`);
        sources.push({ title: `${examName} official website`, url: site });
      }
    } catch (e) {
      console.warn("[ai-exam-writer] scrape failed", e);
    }
  }

  // de-dupe sources by url
  const seen = new Set<string>();
  const uniqueSources = sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return { sources: uniqueSources, notes: chunks.join("\n\n---\n\n").slice(0, 70000) };
}

/** Search phrases tuned to the specific missing modules, so a gap-fill pass
 *  re-researches ONLY the facts that are still missing (cheap + focused). */
const GAP_QUERY: Record<string, string> = {
  fees: "application fee for General OBC SC ST PwD category late fee payment refund policy",
  fees_notes: "application fee payment modes net banking UPI refund policy",
  dates: "important dates registration window exam date admit card result schedule",
  hero: "official notification conducting body exam mode duration frequency",
  eligibility: "eligibility criteria graduation percentage age reservation relaxation",
  registration: "how to apply registration steps documents photo signature specifications",
  pattern: "exam pattern number of questions sections marks duration",
  marking: "marking scheme negative marking per question marks",
  syllabus: "detailed syllabus subject wise topics",
  papers: "previous year question papers download",
  difficulty: "sectional difficulty analysis previous year",
  cutoffs: "cutoff percentile category wise previous year",
  colleges: "participating institutes accepting scores list",
  centres: "exam city test centre list",
  counselling: "counselling process schedule seat allotment",
  admit_card: "admit card release download steps",
  exam_day: "exam day guidelines prohibited items reporting time",
  result: "result declaration scorecard download",
  updates: "latest news notification update",
  faqs: "frequently asked questions candidates",
};

/** Targeted research pass for a gap-fill run: only queries tied to the
 *  missing modules, restricted to the official domain when we know it. */
async function researchGaps(
  examName: string,
  year: number | null,
  site: string | undefined,
  keys: string[],
) {
  const label = `${examName}${year ? ` ${year}` : ""}`;
  const domain = site ? site.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  const prefix = domain ? `site:${domain} ` : "";
  const sources: { title: string; url: string }[] = [];
  const chunks: string[] = [];

  const phrases = [...new Set(keys.map((k) => GAP_QUERY[k]).filter(Boolean))].slice(0, 5);
  if (!phrases.length) phrases.push("official notification details");

  for (const phrase of phrases) {
    try {
      const results = await firecrawlSearch({
        query: `${prefix}${label} ${phrase}`,
        limit: 3,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      });
      for (const r of results) {
        if (!r.url) continue;
        sources.push({ title: r.title || r.url, url: r.url });
        const md = (r.markdown || r.description || "").slice(0, 6000);
        if (md) chunks.push(`SOURCE: ${r.url}\n${md}`);
      }
    } catch (e) {
      console.warn("[ai-exam-writer] gap search failed", phrase, e);
    }
  }

  if (site) {
    try {
      const scraped = await firecrawlScrape(site, ["markdown"]);
      const md = (scraped?.markdown || scraped?.data?.markdown || "").slice(0, 8000);
      if (md) {
        chunks.push(`SOURCE (official site): ${site}\n${md}`);
        sources.push({ title: `${examName} official website`, url: site });
      }
    } catch (e) {
      console.warn("[ai-exam-writer] gap scrape failed", e);
    }
  }

  const seenUrl = new Set<string>();
  return {
    sources: sources.filter((s) => (seenUrl.has(s.url) ? false : (seenUrl.add(s.url), true))),
    notes: chunks.join("\n\n---\n\n").slice(0, 60000),
  };
}



function extractJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch { /* fallthrough */ }
    }
  }
  throw new Error("AI returned invalid JSON");
}

async function generateBatch(
  batch: BatchName,
  examName: string,
  year: number | null,
  ctx: { site?: string; category?: string; notes?: string; researchNotes: string },
  repair?: { gaps: string[]; previous: Record<string, any> },
): Promise<{ data: any; tokens: number }> {
  const extra = batch === "discovery" ? MBA_COMPASS_SECTION_RULES : "";
  const repairBlock = repair
    ? `

GAP-FILL PASS — the previous attempt left these keys BLANK or TOO THIN: ${repair.gaps.join(", ")}.
Return the JSON object again, but this time these keys MUST be complete, deep and at full required depth. Do not shorten anything.
For reference, here is what was produced before (improve and expand it; keep confirmed facts identical, never contradict them):
${JSON.stringify(
      Object.fromEntries(repair.gaps.map((k) => [k, repair.previous?.[k] ?? null])),
    ).slice(0, 12000)}
Structural facts (pattern, marking, syllabus, eligibility norms, registration steps, exam-day rules, counselling flow, preparation guidance, fee categories, payment/refund policy, centre cities, participating institutes, FAQs) are stable year to year — they must NEVER be left blank. Only genuinely unpublished dates/figures may stay empty.`
    : "";
  const prompt = `${baseRules(examName, year)}

EXAM CATEGORY HINT: ${ctx.category || "auto-detect (Management / Engineering / Law / Medical / Government / Other)"}
OFFICIAL WEBSITE: ${ctx.site || "unknown — detect from research"}
ADMIN INSTRUCTIONS: ${ctx.notes || "none"}

OFFICIAL RESEARCH (verbatim extracts from official/authoritative sources — treat as the only trusted facts):
${ctx.researchNotes || "(no research available — rely only on well-established official facts and leave anything uncertain blank)"}

Generate ONLY this JSON object for the "${batch}" module group:
${SHAPES[batch]}
${extra}${repairBlock}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  let resp: Response;
  try {
    resp = await callAIGateway(
      {
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 24000,
      },
      {
        feature: `ai-exam-writer:${batch}`,
        provider: "openai-mini",
        purpose: "long",
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`AI ${resp.status}: ${t.slice(0, 300)}`);
  }
  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content || "";
  const tokens = json?.usage?.total_tokens ?? 0;
  return { data: extractJson(text), tokens };
}

/** Merge repair output into the base data, keeping whichever version is richer. */
function mergeRicher(base: Record<string, any>, next: Record<string, any>, keys: string[]) {
  const size = (v: any): number =>
    Array.isArray(v) ? v.length
      : typeof v === "string" ? wordCount(v)
      : v && typeof v === "object" ? JSON.stringify(v).length
      : 0;
  for (const k of keys) {
    if (next?.[k] === undefined || next[k] === null) continue;
    if (size(next[k]) >= size(base?.[k])) base[k] = next[k];
  }
  return base;
}


/**
 * Runs `work` while streaming whitespace heartbeats so the platform never sees
 * an idle connection (research + multi-pass generation can run for minutes).
 * Leading whitespace is valid JSON padding, so callers can still `res.json()`.
 */
function streamWithHeartbeat(work: () => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const beat = setInterval(() => {
        try { controller.enqueue(encoder.encode(" ")); } catch { /* closed */ }
      }, 10_000);
      try {
        const payload = await work();
        controller.enqueue(encoder.encode(JSON.stringify(payload)));
      } catch (e) {
        controller.enqueue(encoder.encode(JSON.stringify({
          error: e instanceof Error ? e.message : String(e),
        })));
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireAdmin(req, corsHeaders);
  if (guard) return guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const examName: string = (body.exam_name || "").trim();
  if (!examName) {
    return new Response(JSON.stringify({ error: "exam_name is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const year: number | null = body.exam_year ? Number(body.exam_year) : null;

  // Stage 1 — research only. Kept as its own request so a single invocation
  // never has to do Firecrawl crawling AND long generation back to back.
  if (body.stage === "research") {
    return streamWithHeartbeat(async () => {
      const researchData = await research(examName, year, body.official_website);
      return { research: researchData, sources: researchData.sources || [] };
    });
  }

  // Stage 2 — gap-fill only. Takes the EXISTING sections of a published exam
  // plus (optionally) a gap list, re-researches only the missing facts from the
  // official site and returns a PATCH containing just the repaired modules.
  if (body.stage === "gapfill") {
    return streamWithHeartbeat(async () => {
      const existing: Record<string, any> =
        body.sections && typeof body.sections === "object" ? body.sections : {};

      const allGaps: Gap[] = Array.isArray(body.gaps) && body.gaps.length
        ? body.gaps.map((g: any) =>
            typeof g === "string" ? { key: g, detail: g } : { key: g.key, detail: g.detail || g.key })
        : auditExamSections(existing);

      if (!allGaps.length) {
        return { patch: {}, gaps_before: 0, gaps_after: 0, tokens_used: 0, sources: [], batches: [] };
      }

      const keys = [...new Set(allGaps.map((g) => g.key))];
      const researchData = body.research?.notes
        ? body.research
        : await researchGaps(examName, year, body.official_website, keys);

      const ctx = {
        site: body.official_website,
        category: body.exam_category,
        notes: body.notes,
        researchNotes: researchData.notes,
      };

      const byBatch = gapsByBatch(allGaps);
      const requested: BatchName[] = Array.isArray(body.batches) && body.batches.length
        ? body.batches
        : (Object.keys(byBatch) as BatchName[]);

      const patch: Record<string, any> = {};
      const errors: string[] = [];
      let tokens = 0;
      const handled: string[] = [];

      for (const batch of requested) {
        const batchGaps = byBatch[batch];
        if (!batchGaps?.length) continue;
        const gapKeyList = [...new Set(batchGaps.map((g) => g.key))];
        try {
          const { data, tokens: t } = await generateBatch(batch, examName, year, ctx, {
            gaps: batchGaps.map((g) => `${g.key} — ${g.detail}`),
            previous: existing,
          });
          tokens += t;
          // keep only the modules that actually had gaps, and only when the new
          // version is at least as rich as what is already live
          const merged = mergeRicher({ ...existing }, data, gapKeyList);
          for (const k of gapKeyList) {
            if (merged[k] !== undefined && merged[k] !== existing[k]) patch[k] = merged[k];
          }
          handled.push(batch);
        } catch (e) {
          errors.push(`${batch}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Never ship blank rows / placeholder cells: prune the merged result and
      // keep only the pruned versions of the patched keys.
      const pruned = pruneBlankContent({ ...existing, ...patch });
      const finalPatch: Record<string, any> = {};
      for (const k of Object.keys(patch)) {
        if (pruned[k] !== undefined) finalPatch[k] = pruned[k];
      }

      const after = auditExamSections({ ...existing, ...finalPatch });
      return {
        patch: finalPatch,
        gaps_before: allGaps.length,
        gaps_after: after.length,
        gaps_remaining: after,
        keys_patched: Object.keys(finalPatch),
        batches: handled,
        sources: researchData.sources || [],
        research: researchData,
        tokens_used: tokens,
        errors,
      };
    });
  }



  return streamWithHeartbeat(async () => {
    const batches: BatchName[] = Array.isArray(body.batches) && body.batches.length
      ? body.batches
      : ["core", "exam", "outcomes", "discovery"];

    const researchData = body.research?.notes !== undefined
      ? body.research
      : await research(examName, year, body.official_website);

    const sections: Record<string, any> = {};
    let tokens = 0;
    const errors: string[] = [];
    const coverage: Record<string, { gaps: string[]; passes: number }> = {};
    // One repair pass per request by default — the worker re-invokes this
    // function for further passes instead of holding one long connection.
    const maxRepairs = Number.isFinite(Number(body.max_repair_passes))
      ? Math.max(0, Math.min(3, Number(body.max_repair_passes)))
      : 1;

    const ctx = {
      site: body.official_website,
      category: body.exam_category,
      notes: body.notes,
      researchNotes: researchData.notes,
    };

    for (const batch of batches) {
      try {
        let { data, tokens: t } = await generateBatch(batch, examName, year, ctx);
        tokens += t;
        let gaps = findGaps(batch, data);
        let passes = 1;

        // Auto gap-fill: re-ask only for the modules that came back blank/thin.
        while (gaps.length && passes <= maxRepairs) {
          try {
            const repaired = await generateBatch(batch, examName, year, ctx, {
              gaps,
              previous: data,
            });
            tokens += repaired.tokens;
            data = mergeRicher(data, repaired.data, BATCH_KEYS[batch]);
            const next = findGaps(batch, data);
            passes += 1;
            if (next.length === gaps.length && next.every((k, i) => k === gaps[i])) {
              gaps = next;
              break; // no progress — stop burning credits
            }
            gaps = next;
          } catch (e) {
            errors.push(`${batch} repair: ${e instanceof Error ? e.message : String(e)}`);
            break;
          }
        }

        coverage[batch] = { gaps, passes };
        for (const key of BATCH_KEYS[batch]) {
          if (data?.[key] !== undefined) sections[key] = data[key];
        }
      } catch (e) {
        errors.push(`${batch}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      sections,
      sources: researchData.sources || [],
      research: researchData,
      tokens_used: tokens,
      coverage,
      errors,
    };
  });
});

