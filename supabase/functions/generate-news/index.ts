// News & Insights — AI-curated current affairs generator
// Accepts categories[], date range, count per category. Produces trilingual
// short summaries (English / Hindi / Hinglish) and upserts into public.news_articles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const categories: string[] = Array.isArray(body?.categories) && body.categories.length
      ? body.categories.filter((c: any) => typeof c === "string")
      : DEFAULT_CATEGORIES;
    const countPerCategory = Math.max(1, Math.min(Number(body?.count_per_category) || 3, 8));
    const dateFrom: string = body?.date_from || new Date().toISOString().slice(0, 10);
    const dateTo: string = body?.date_to || dateFrom;
    const focus: string = typeof body?.focus === "string" ? body.focus : "";

    const sys = `You are an MBA current-affairs editor for Indian B-school aspirants (CAT/XAT/SNAP/NMAT/GDPI/WAT).
Generate concise, factually-grounded, exam-focused news cards covering the date range ${dateFrom} to ${dateTo}.
Cover the requested categories with the most updated, important happenings in India and globally during that window.
Use realistic Indian sources (Economic Times, Mint, Business Standard, The Hindu, PIB, RBI, Bloomberg, Reuters).
Return STRICTLY valid JSON via the tool. No commentary.`;

    const user = `Generate ${countPerCategory} news cards FOR EACH of these categories: ${categories.join(", ")}.
${focus ? `Extra focus / topic constraint: ${focus}\n` : ""}
For each card include:
- headline (English, sharp, <120 chars)
- one_liner (English, <140 chars)
- short_summary (English, 3-5 lines)
- short_summary_hi (Hindi, Devanagari, 3-5 lines — same factual content)
- short_summary_hinglish (Hinglish — Hindi written in Roman script mixed with English, casual student tone, 3-5 lines)
- detailed_summary (English, 6-10 lines)
- why_matters (English, 2-3 lines on impact for India/business/MBA)
- key_facts (3-6 bullets with numbers/names)
- gdpi_points (3-5 interview/discussion bullets)
- wat_topics (2-3 essay angles)
- vocabulary (1-3 advanced MBA words: { word, meaning })
- exam_relevance (0-10 scores for cat, xat, snap, nmat, gdpi, wat)
- importance ("high" | "medium" | "low")
- reading_seconds (30-90)
- source_name, source_url (realistic)
- news_date (YYYY-MM-DD within ${dateFrom}..${dateTo})
- category (exactly one from the requested list)`;

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
                },
              },
              exam_relevance: {
                type: "object",
                properties: {
                  cat: { type: "number" }, xat: { type: "number" }, snap: { type: "number" },
                  nmat: { type: "number" }, gdpi: { type: "number" }, wat: { type: "number" },
                },
              },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["headline", "category", "short_summary", "short_summary_hi", "short_summary_hinglish", "importance"],
          },
        },
      },
      required: ["articles"],
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_news",
            description: "Emit the structured set of news cards",
            parameters: schema,
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_news" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${aiRes.status}: ${t}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) throw new Error("AI returned no tool call");
    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    const articles: any[] = Array.isArray(parsed?.articles) ? parsed.articles : [];

    const safeDate = (d: any): string => {
      if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return dateTo;
      return d;
    };

    const rows = articles.map((a) => ({
      headline: String(a.headline || "").slice(0, 500),
      category: String(a.category || "National"),
      source_name: a.source_name || null,
      source_url: a.source_url || null,
      one_liner: a.one_liner || null,
      short_summary: a.short_summary || null,
      short_summary_hi: a.short_summary_hi || null,
      short_summary_hinglish: a.short_summary_hinglish || null,
      detailed_summary: a.detailed_summary || null,
      why_matters: a.why_matters || null,
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
    }));

    if (rows.length) {
      const { error } = await supabase.from("news_articles").insert(rows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-news error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
