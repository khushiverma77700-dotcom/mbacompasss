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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-worker-key",
};

const MODEL = "gpt-5-mini";

export type BatchName = "core" | "exam" | "outcomes" | "discovery";

const BATCH_KEYS: Record<BatchName, string[]> = {
  core: ["hero", "quick_answer", "highlights", "dates", "overview", "eligibility", "registration", "fees"],
  exam: ["pattern", "marking", "syllabus", "resources", "papers", "difficulty", "preparation", "tools"],
  outcomes: ["cutoffs", "colleges", "comparisons", "counselling", "admit_card", "exam_day", "centres", "result", "after_exam"],
  discovery: ["related_exams", "related_searches", "updates", "faqs", "seo"],
};

const SHAPES: Record<BatchName, string> = {
  core: `{
  "hero": { "full_form": string, "tagline": string, "exam_category": string, "exam_level": string, "exam_mode": string, "frequency": string, "duration": string, "conducting_body": string, "official_website": string, "registration_status": string, "exam_status": string },
  "quick_answer": [ { "q": string, "a": string } ],            // 6-10 items, answers 1-3 sentences
  "highlights": [ { "label": string, "value": string } ],       // 6-10 factual cards
  "dates": [ { "event": string, "date": string, "status": string, "notes": string } ],
  "overview": string,                                            // HTML: 4-7 <p>/<h3> blocks, exam-specific
  "eligibility": { "summary": string /*HTML*/, "criteria": [ { "label": string, "value": string } ], "can_i_apply": [ { "q": string, "a": string } ] },
  "registration": { "steps": [ { "title": string, "detail": string } ], "documents": [string], "notes": string /*HTML*/ },
  "fees": [ { "category": string, "fee": string } ]
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
- Respect minimum depth: highlights 8-12 cards, quick_answer 8-10 Q&As, dates 8-12 events, syllabus every subject with topics AND subtopics, registration 6-10 steps, faqs 20-30 questions, eligibility criteria 6-10 rows.
- highlights: keep each "value" SHORT and scannable (under ~60 characters, no explanatory clauses in brackets). Put long explanations in the relevant prose module instead. For portal/website/helpdesk cards, the value must be the bare URL, email or phone only.

SEO / AEO / GEO RULES:
- SEO: use the exam's real search vocabulary naturally — "${label} exam date", "${label} eligibility", "${label} syllabus", "${label} registration", "${label} cutoff", "${label} exam pattern" — in headings and the first sentence of each block. No keyword stuffing.
- AEO: start every HTML block and every FAQ answer with a direct, self-contained 1-2 sentence answer, then expand. Answers must make sense when quoted alone by a voice assistant or featured snippet.
- GEO: write extractable, citation-friendly statements — one fact per sentence, named entities spelled in full on first use (conducting body, institute names, portal names), explicit numbers and units, and no vague pronouns. Prefer lists and tables over long paragraphs so LLMs can lift the facts cleanly.
- Each HTML field: clean semantic HTML only (<p>, <h3>, <ul>, <li>, <strong>, <table>). No inline styles, no <script>, no links to non-official sites.
- Write for Indian aspirants, mentor tone, specific and useful — no filler.

Return STRICT JSON matching the requested shape. No markdown fences, no commentary.`;
}


async function research(examName: string, year: number | null, site?: string) {
  const label = `${examName}${year ? ` ${year}` : ""}`;
  const sources: { title: string; url: string }[] = [];
  const chunks: string[] = [];

  try {
    const queries = [
      site ? `site:${site.replace(/^https?:\/\//, "").replace(/\/$/, "")} ${label} notification eligibility exam pattern` : `${label} official notification eligibility exam pattern registration dates`,
      `${label} official syllabus marking scheme cutoff participating institutes`,
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

  return { sources: uniqueSources, notes: chunks.join("\n\n---\n\n").slice(0, 45000) };
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
): Promise<{ data: any; tokens: number }> {
  const extra = batch === "discovery" ? MBA_COMPASS_SECTION_RULES : "";
  const prompt = `${baseRules(examName, year)}

EXAM CATEGORY HINT: ${ctx.category || "auto-detect (Management / Engineering / Law / Medical / Government / Other)"}
OFFICIAL WEBSITE: ${ctx.site || "unknown — detect from research"}
ADMIN INSTRUCTIONS: ${ctx.notes || "none"}

OFFICIAL RESEARCH (verbatim extracts from official/authoritative sources — treat as the only trusted facts):
${ctx.researchNotes || "(no research available — rely only on well-established official facts and leave anything uncertain blank)"}

Generate ONLY this JSON object for the "${batch}" module group:
${SHAPES[batch]}
${extra}`;

  const resp = await callAIGateway(
    {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 12000,
    },
    { feature: `ai-exam-writer:${batch}`, provider: "openai-mini", purpose: "long" },
  );

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`AI ${resp.status}: ${t.slice(0, 300)}`);
  }
  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content || "";
  const tokens = json?.usage?.total_tokens ?? 0;
  return { data: extractJson(text), tokens };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireAdmin(req, corsHeaders);
  if (guard) return guard;

  try {
    const body = await req.json();
    const examName: string = (body.exam_name || "").trim();
    if (!examName) throw new Error("exam_name is required");
    const year: number | null = body.exam_year ? Number(body.exam_year) : null;
    const batches: BatchName[] = Array.isArray(body.batches) && body.batches.length
      ? body.batches
      : ["core", "exam", "outcomes", "discovery"];

    const researchData = body.research?.notes !== undefined
      ? body.research
      : await research(examName, year, body.official_website);

    const sections: Record<string, any> = {};
    let tokens = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      try {
        const { data, tokens: t } = await generateBatch(batch, examName, year, {
          site: body.official_website,
          category: body.exam_category,
          notes: body.notes,
          researchNotes: researchData.notes,
        });
        tokens += t;
        for (const key of BATCH_KEYS[batch]) {
          if (data?.[key] !== undefined) sections[key] = data[key];
        }
      } catch (e) {
        errors.push(`${batch}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({
        sections,
        sources: researchData.sources || [],
        research: researchData,
        tokens_used: tokens,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
