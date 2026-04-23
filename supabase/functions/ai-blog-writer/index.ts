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
    const _now = new Date();
    const _yr = _now.getFullYear();
    const dateCtx = brief.contentDateContext?.trim() ||
      `Use only the most recent verified data (${_yr}-${_yr + 1} admission cycle, ${_yr - 1}-${_yr} placement reports). All dates, exam cycles, fees, cutoffs and statistics MUST reflect the latest available year. Do NOT use outdated 2020-2023 figures unless explicitly historical context. Today is ${_now.toISOString().slice(0, 10)}.`;

    // Approx target keyword occurrences. NOTE: 10% literal density is unnatural and Google-flag-worthy.
    // The prompt asks the model to AIM for the requested density while keeping prose natural.
    const targetWords = Math.round((wmin + wmax) / 2);
    const targetOccurrences = Math.round((targetWords * density) / 100);

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();

    const systemPrompt = `You are an expert SEO content writer specializing in MBA, PGP, PGDM and Masters-in-Management (MiM) content for the Indian audience. You write in a clear, friendly, HUMAN voice — like a smart senior mentor talking to a student. Plain English, short sentences, contractions allowed (you're, don't, it's). Avoid corporate jargon, avoid "In today's fast-paced world..." style fluff, avoid robotic AI phrasing.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY claim, table, list and stat MUST be filled with concrete, latest ${currentYear} data. NEVER use phrases like "data not available", "varies widely", "depends on the institute", "contact for details", "TBD". If you don't have an exact ${currentYear} figure, give a tight realistic ${currentYear - 1}-${currentYear} range (e.g. "INR 25-32 LPA", "98% placement rate", "5,000-7,000 seats").
- Tables MUST have real rows with real numbers — never empty cells, never "—", never "N/A".
- Recruiter lists, college lists, exam-pattern facts MUST be real and named — never placeholder.

# SCOPE LOCK — MBA / MASTERS IN MANAGEMENT ONLY (NON-NEGOTIABLE)
- Every article MUST stay strictly within MBA / PGP / PGDM / PGPM / MMS / MMM / EMBA / PGPX / PGCM / PGPBM / Executive MBA / 1-Year MBA / Masters in Management (MiM) topics, plus the entrance ecosystem that feeds them (CAT, XAT, NMAT, SNAP, CMAT, GMAT, MAT, IIFT, MICAT, TISSNET, MAH-CET).
- DO NOT write about B.Tech, M.Tech, BE, ME, BCA, MCA, B.Sc, M.Sc, engineering, medical, law, design, coding bootcamps, data-science certifications, school-level boards or any non-management discipline. If the working title is ambiguous, interpret it through the MBA / MiM lens.
- Recruiters, salaries, fees, specializations and example colleges referenced must all be management-program-specific.

# FRESHNESS & MACHINE-READABLE CITATIONS
- Today is ${todayIso}. Active admission cycle: ${currentYear}-${currentYear + 1}. Placement reference: ${currentYear - 1}-${currentYear}.
- For EVERY key stat (cutoff, fee, package, percentile band, ranking) append a machine-readable inline citation marker in this EXACT shape: [src:<Source> <Year>]. Examples: [src:NIRF ${currentYear}], [src:CAT Notification ${currentYear}], [src:Placement Report ${currentYear - 1}-${String(currentYear).slice(-2)}]. Our frontend converts these markers into clickable "view source" pills — the syntax must be exact (square brackets, "src:" prefix, no quotes, no URLs).
- End the article with a small italic line: <p><em>Last updated: ${todayIso}</em></p>.

# OUTPUT FORMAT
- Valid HTML using only these tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>. Do NOT include <html>, <head>, <body>, <h1>, or markdown fences. NO inline style="", NO <font>, NO class/id attributes — plain semantic HTML only so typography stays uniform.`;

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
3. **MANDATORY OPENING — TL;DR SUMMARY**: The very first element of "intro" MUST be a <p> block that starts with <strong>Quick Summary:</strong> followed by a tight 55-65 word overview of the entire article. This summary must give the reader the core answer/takeaway upfront — NOT tease it.
4. **NEVER START WITH A QUESTION**. The first sentence after the Quick Summary, every <h2>, and every paragraph opener must be a DECLARATIVE statement that gives the student an answer or a clear fact. Bad: "Why should you prepare for CAT without coaching?" Good: "Self-study works for CAT when you have discipline, the right material, and a 6-month runway." Headings can be topic phrases (e.g. "How to Prepare for CAT Without Coaching") but never end with a question mark — except inside the final FAQ section.
5. **HUMANIZED LANGUAGE**: Write at roughly an 8th-grade reading level. Use contractions, real examples, second person ("you"), and concrete numbers. Vary sentence length. NO phrases like "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving". NO em-dash overuse.
6. Use short paragraphs (2-4 sentences), bullet/numbered lists, and at least one HTML table where it adds value (comparison, fees, dates, cutoffs, etc.).
7. **STRUCTURE** (in this exact order inside intro + content):
   a. Quick Summary paragraph (rule 3)
   b. 1-2 paragraph hook that states the problem and the answer
   c. 6-10 <h2> sections with <h3> subsections where helpful
   d. A "Key Takeaways" <h2> with 4-6 bullet points
   e. A final <h2>Frequently Asked Questions</h2> with 4-6 Q&A (each Q in <h3>, A in <p>)
   f. A short CTA paragraph at the very end
8. **ON-PAGE SEO MUST-HAVES (build these into the HTML naturally)**:
   - Primary keyword in the first 100 words AND in at least 2 <h2> headings.
   - Secondary keywords sprinkled in <h2>/<h3>/<p> where they fit naturally.
   - At least 3-5 internal-link-style anchors using relative URLs to relevant site sections, e.g. <a href="/colleges">top MBA colleges</a>, <a href="/coaching">CAT coaching</a>, <a href="/exams/cat">CAT exam</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/college-shortlister">College Shortlister</a>. Choose the ones that genuinely fit the topic.
   - At least 1-2 outward references to authoritative bodies by name in plain text (e.g. "as per IIM Bangalore's 2025 placement report") — do NOT fabricate URLs.
   - Use <strong> on 6-12 high-value phrases (keywords + key facts). Use <em> sparingly.
   - Add descriptive image-alt-friendly phrasing inside paragraphs near where images would go (e.g. "the CAT 2025 sectional cutoff chart below…") even though we don't insert <img> tags.
   - Use semantic lists (<ul>/<ol>) for any enumeration of 3+ items.
   - Include a comparison or data <table> at least once.
9. **FORMATTING POLISH**: Bold the first 2-4 words of important paragraphs when it improves scannability. Keep <h2> titles 4-9 words, benefit-driven, not clickbait. No ALL-CAPS shouting.
10. Include real, current Indian MBA ecosystem context (CAT, XAT, NMAT, SNAP, IIMs, top private B-schools, fee ranges in lakhs, recent 2025-2026 dates wherever applicable).
11. Do NOT invent numbers that look implausible. If unsure, use ranges (e.g., "INR 18-25 lakhs").
12. Do NOT include any <h1> — the title is rendered separately.

# OUTPUT FORMAT (return JSON via the tool call below)
- title: refined version of the working title (<= 70 chars). MUST NOT end with "?".
- slug: URL slug, lowercase-hyphenated (<= 80 chars)
- metaTitle: <= 60 chars, include primary keyword, no question mark at the end
- metaDescription: 140-160 chars, include primary keyword, action-oriented, declarative (not a question)
- excerpt: 1-2 sentences, plain text, ~160-220 chars, declarative
- intro: opening HTML — MUST begin with the <p><strong>Quick Summary:</strong> ... </p> block, then 1-2 hook paragraphs. No headings inside intro.
- content: the FULL article body as HTML (everything AFTER the intro, no <h1>), including the Key Takeaways section, FAQ section and final CTA paragraph.
- h1Tag: the on-page H1 (usually same as title, declarative, no "?")
- keywords: array of 8-12 keywords (mix of short and long tail). MUST include the primary keyword as the first item.
- primaryKeyword: the primary target keyword (echo "${targetKw}")
- wordCount: integer, your accurate count of words in (intro + content) plain text
- keywordOccurrences: integer, how many times "${targetKw}" appears in (intro + content)
- author: a sensible byline like "MBA Compass Editorial" or a topic-appropriate author name`;

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_blog_article" } },
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
    console.log("AI finish_reason:", aiJson?.choices?.[0]?.finish_reason);
    const message = aiJson?.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;

    if (!rawArgs) {
      console.error("No tool call. Message preview:", JSON.stringify(message)?.slice(0, 800));
      return new Response(
        JSON.stringify({
          error: "AI did not return a structured article",
          detail: message?.content?.slice(0, 300) || "no content returned",
          finish_reason: aiJson?.choices?.[0]?.finish_reason,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let article: any;
    try {
      article = JSON.parse(rawArgs);
    } catch (e) {
      console.error("Parse fail. Length:", rawArgs.length, "Tail:", rawArgs.slice(-300));
      return new Response(
        JSON.stringify({ error: "AI output was truncated or malformed JSON. Try again or reduce word count.", detail: String(e).slice(0, 200) }),
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

    // ── Auto-extract FAQs from the FAQ section so the article snapshot can carry FAQ schema ──
    const extractFaqs = (html: string) => {
      if (!html) return [];
      const re2 = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      const out: { question: string; answer: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re2.exec(html))) {
        const q = m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const a = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (q && a && (q.endsWith("?") || /^(what|why|how|is|are|can|should|do|does|when|where|which|who)\b/i.test(q)) && a.length >= 20) {
          out.push({ question: q, answer: a });
        }
      }
      const seen = new Set<string>();
      return out.filter((f) => {
        const k = f.question.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 8);
    };
    const extractedFaqs = extractFaqs(article.content || "");

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          ...article,
          slug,
          // never override target keyword
          primaryKeyword: targetKw,
        },
        faqs: extractedFaqs,
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
