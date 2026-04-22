// AI Blog Writer — generates a full SEO-optimized article (2000-2500 words, ~10% keyword density)
// using Lovable AI Gateway (openai/gpt-5).
// Public endpoint (verify_jwt = false in supabase/config.toml is the project default).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BlogBrief {
  title: string;
  slug?: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  contentDateContext?: string; // e.g. "Use latest 2025-2026 dates and figures"
  wordCountMin?: number;
  wordCountMax?: number;
  keywordDensityPct?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brief = (await req.json()) as BlogBrief;
    if (!brief?.title || !brief?.targetKeyword) {
      return new Response(
        JSON.stringify({ error: "title and targetKeyword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wmin = brief.wordCountMin ?? 2000;
    const wmax = brief.wordCountMax ?? 2500;
    const density = brief.keywordDensityPct ?? 10;
    const targetKw = brief.targetKeyword.trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const dateCtx = brief.contentDateContext?.trim() ||
      "Use only the most recent dates, exam cycles, statistics and figures (2025-2026). Do NOT use outdated years like 2020-2023 unless required for historical context.";

    // Approx target keyword occurrences. NOTE: 10% literal density is unnatural and Google-flag-worthy.
    // The prompt asks the model to AIM for the requested density while keeping prose natural.
    const targetWords = Math.round((wmin + wmax) / 2);
    const targetOccurrences = Math.round((targetWords * density) / 100);

    const systemPrompt = `You are an expert SEO content writer specializing in MBA, B-school, coaching and exam preparation content for the Indian audience. You write in a clear, authoritative "smart MBA advisor" voice — never generic, never robotic. Output is valid HTML using only these tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Do NOT include <html>, <head>, <body>, <h1>, or markdown fences.`;

    const userPrompt = `Write a complete, ready-to-publish SEO blog article.

# BRIEF
- Working title: ${brief.title}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(none provided)"}
- Category: ${brief.category || "news"}
- Date context: ${dateCtx}

# HARD RULES
1. Word count: ${wmin}-${wmax} words. Stay strictly inside this range.
2. Keyword density: aim for the primary keyword "${targetKw}" to appear ~${targetOccurrences} times (~${density}% density) NATURALLY across H2s, intro, body and conclusion. Use exact match plus close variants. Never keyword-stuff into a single paragraph.
3. Use short paragraphs (2-4 sentences), bullet/numbered lists, and at least one HTML table where it adds value (comparison, fees, dates, cutoffs, etc.).
4. Structure: a strong intro paragraph, then 6-10 <h2> sections, with <h3> subsections where helpful, and a final FAQ section with 4-6 Q&A.
5. Include real, current Indian MBA ecosystem context (CAT, XAT, NMAT, SNAP, IIMs, top private B-schools, fee ranges in lakhs, recent 2025-2026 dates wherever applicable).
6. Do NOT invent numbers that look implausible. If unsure, use ranges (e.g., "INR 18-25 lakhs").
7. Do NOT include any <h1> — the title is rendered separately.
8. Sprinkle the secondary keywords naturally where they fit.
9. End with a short CTA paragraph encouraging the reader to explore related resources on the site.

# OUTPUT FORMAT (return JSON via the tool call below)
- title: refined version of the working title (<= 70 chars)
- slug: URL slug, lowercase-hyphenated (<= 80 chars)
- metaTitle: <= 60 chars, include primary keyword
- metaDescription: 140-160 chars, include primary keyword, action-oriented
- excerpt: 1-2 sentences, plain text, ~160-220 chars
- intro: opening paragraph as HTML (<p>...)
- content: the FULL article body as HTML (everything AFTER the intro, no <h1>)
- h1Tag: the on-page H1 (usually same as title, may be slightly more descriptive)
- keywords: array of 8-12 keywords (mix of short and long tail). MUST include the primary keyword as the first item.
- primaryKeyword: the primary target keyword (echo "${targetKw}")
- wordCount: integer, your accurate count of words in (intro + content) plain text
- keywordOccurrences: integer, how many times "${targetKw}" appears in (intro + content)
- author: a sensible byline like "MBAHub Editorial" or a topic-appropriate author name`;

    const tool = {
      type: "function",
      function: {
        name: "publish_blog_article",
        description: "Return a fully-written SEO blog article matching the brief.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            slug: { type: "string" },
            metaTitle: { type: "string" },
            metaDescription: { type: "string" },
            excerpt: { type: "string" },
            intro: { type: "string" },
            content: { type: "string" },
            h1Tag: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            primaryKeyword: { type: "string" },
            wordCount: { type: "integer" },
            keywordOccurrences: { type: "integer" },
            author: { type: "string" },
          },
          required: [
            "title", "slug", "metaTitle", "metaDescription", "excerpt",
            "intro", "content", "h1Tag", "keywords", "primaryKeyword",
            "wordCount", "keywordOccurrences", "author",
          ],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_blog_article" } },
        max_completion_tokens: 8000,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed", detail: txt.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI did not return a structured article" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let article: any;
    try {
      article = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Best-effort sanitisation
    const slug = String(article.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Compute actual density on server side as a quality metric
    const plain = `${article.intro || ""} ${article.content || ""}`.replace(/<[^>]*>/g, " ");
    const actualWords = plain.split(/\s+/).filter(Boolean).length;
    const re = new RegExp(targetKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const actualOccurrences = (plain.match(re) || []).length;
    const actualDensity = actualWords ? +((actualOccurrences * targetKw.split(/\s+/).length) / actualWords * 100).toFixed(2) : 0;

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          ...article,
          slug,
          // never override target keyword
          primaryKeyword: targetKw,
        },
        stats: {
          targetWordsRange: [wmin, wmax],
          actualWords,
          targetDensityPct: density,
          actualDensityPct: actualDensity,
          actualOccurrences,
          targetOccurrences,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-blog-writer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
