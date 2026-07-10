import { requireAdmin } from "../_shared/requireAdmin.ts";
// News & Insights — AI-curated current affairs generator (OpenAI)
// Generates one category at a time to avoid edge function timeouts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { MBA_COMPASS_SECTION_RULES, getBlockingFactIssues, runFactualRiskCheck, runFinalQualityCheck } from "../_shared/aiContentRules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CATEGORIES = [
  "National", "International", "Economy & Finance", "Politics & Government",
  "Business & Startups", "MBA & Education", "AI & Technology", "Sports",
  "Environment & Climate", "Science & Innovation", "Corporate Affairs",
  "Stock Market", "Awards & Events", "Breaking", "GDPI Important",
];

const schema = {
  type: "object",
  properties: {
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          category: { type: "string" },
          source_name: { type: "string" },
          source_url: { type: "string" },
          one_liner: { type: "string" },
          short_summary: { type: "string" },
          short_summary_hi: { type: "string" },
          short_summary_hinglish: { type: "string" },
          detailed_summary: { type: "string" },
          why_matters: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
          reading_seconds: { type: "number" },
          news_date: { type: "string" },
          gdpi_points: { type: "array", items: { type: "string" } },
          wat_topics: { type: "array", items: { type: "string" } },
          key_facts: { type: "array", items: { type: "string" } },
          vocabulary: {
            type: "array",
            items: {
              type: "object",
              properties: { word: { type: "string" }, meaning: { type: "string" } },
              required: ["word", "meaning"],
              additionalProperties: false,
            },
          },
          exam_relevance: {
            type: "object",
            properties: {
              cat: { type: "number" }, xat: { type: "number" }, snap: { type: "number" },
              nmat: { type: "number" }, gdpi: { type: "number" }, wat: { type: "number" },
            },
            required: ["cat", "xat", "snap", "nmat", "gdpi", "wat"],
            additionalProperties: false,
          },
          tags: { type: "array", items: { type: "string" } },
        },
        required: [
          "headline", "category", "source_name", "source_url", "one_liner",
          "short_summary", "short_summary_hi", "short_summary_hinglish",
          "detailed_summary", "why_matters", "importance", "reading_seconds",
          "news_date", "gdpi_points", "wat_topics", "key_facts", "vocabulary",
          "exam_relevance", "tags",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["articles"],
  additionalProperties: false,
};

async function generateForCategory(opts: {
  apiKey: string;
  category: string;
  count: number;
  dateFrom: string;
  dateTo: string;
  focus: string;
}) {
  const { apiKey, category, count, dateFrom, dateTo, focus } = opts;

  const sys = `You are an MBA current-affairs editor for Indian B-school aspirants (CAT/XAT/SNAP/NMAT/GDPI/WAT).
Generate concise, factually-grounded, exam-focused news cards covering the date range ${dateFrom} to ${dateTo}.
Factual safety beats volume: never fabricate a headline, source URL, exact date, statistic, quote or government/company announcement. Use only events you are confident are real and date-appropriate. If a specific URL is not confidently known, leave source_url as an empty string instead of inventing one.
Return STRICTLY valid JSON. No commentary.`;

  const user = `Generate ${count} news cards for category: "${category}".
${focus ? `Extra focus: ${focus}\n` : ""}
For each card include: headline (English, <120 chars), one_liner (<140 chars),
short_summary (English, 3-5 lines), short_summary_hi (Hindi Devanagari, 3-5 lines),
short_summary_hinglish (Hindi in Roman + English, casual student tone, 3-5 lines),
detailed_summary (English, 6-10 lines), why_matters (2-3 lines),
key_facts (3-6 bullets with numbers/names), gdpi_points (3-5),
wat_topics (2-3), vocabulary (1-3 items {word, meaning}),
exam_relevance (0-10 for cat, xat, snap, nmat, gdpi, wat),
importance (high/medium/low), reading_seconds (30-90),
source_name, source_url (real verified URL only if confidently known, otherwise empty string), news_date (YYYY-MM-DD within ${dateFrom}..${dateTo}),
category (exactly "${category}"), tags (array of 2-5 strings).`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys + MBA_COMPASS_SECTION_RULES },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "news_batch", strict: true, schema },
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 400)}`);
  }
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  const parsed = JSON.parse(content);
  return Array.isArray(parsed?.articles) ? parsed.articles : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAdmin(req, corsHeaders);
  if (_authFail) return _authFail;

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const categories: string[] = Array.isArray(body?.categories) && body.categories.length
      ? body.categories.filter((c: any) => typeof c === "string")
      : DEFAULT_CATEGORIES;
    const countPerCategory = Math.max(1, Math.min(Number(body?.count_per_category) || 3, 8));
    const dateFrom: string = body?.date_from || new Date().toISOString().slice(0, 10);
    const dateTo: string = body?.date_to || dateFrom;
    const focus: string = typeof body?.focus === "string" ? body.focus : "";

    const safeDate = (d: any): string =>
      typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : dateTo;

    let totalInserted = 0;
    const errors: { category: string; error: string }[] = [];

    // Process categories in parallel batches of 3 to balance speed vs. rate limits.
    const BATCH = 3;
    for (let i = 0; i < categories.length; i += BATCH) {
      const slice = categories.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map((cat) =>
          generateForCategory({
            apiKey: OPENAI_API_KEY,
            category: cat,
            count: countPerCategory,
            dateFrom, dateTo, focus,
          }),
        ),
      );

      const rows: any[] = [];
      results.forEach((r, idx) => {
        const cat = slice[idx];
        if (r.status === "rejected") {
          errors.push({ category: cat, error: String(r.reason?.message || r.reason) });
          return;
        }
        for (const a of r.value) {
          const factBlocks = getBlockingFactIssues(runFactualRiskCheck(a));
          if (factBlocks.length) {
            errors.push({
              category: cat,
              error: `Skipped unsafe AI news card: ${factBlocks.map((i) => i.message).join(" | ").slice(0, 500)}`,
            });
            continue;
          }
          // Buzzword scrub on every text field (no MBA Compass injection for news blurbs)
          const scrub = (s: any) => typeof s === "string" && s ? runFinalQualityCheck(s, { requireMbaCompass: false, minInternalLinks: 0 }).html : s;
          rows.push({
            headline: scrub(String(a.headline || "").slice(0, 500)),
            category: String(a.category || cat),
            source_name: a.source_name || null,
            source_url: a.source_url || null,
            one_liner: scrub(a.one_liner) || null,
            short_summary: scrub(a.short_summary) || null,
            short_summary_hi: a.short_summary_hi || null,
            short_summary_hinglish: a.short_summary_hinglish || null,
            detailed_summary: scrub(a.detailed_summary) || null,
            why_matters: scrub(a.why_matters) || null,
            gdpi_points: a.gdpi_points || [],
            wat_topics: a.wat_topics || [],
            key_facts: a.key_facts || [],
            vocabulary: a.vocabulary || [],
            exam_relevance: a.exam_relevance || {},
            tags: Array.isArray(a.tags) ? a.tags : [],
            importance: ["high", "medium", "low"].includes(a.importance) ? a.importance : "medium",
            reading_seconds: Number(a.reading_seconds) || 45,
            news_date: safeDate(a.news_date),
            ai_generated: true,
            published_at: new Date().toISOString(),
          });
        }
      });

      if (rows.length) {
        const { error } = await supabase.from("news_articles").insert(rows);
        if (error) {
          errors.push({ category: slice.join(","), error: `DB: ${error.message}` });
        } else {
          totalInserted += rows.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-news error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
