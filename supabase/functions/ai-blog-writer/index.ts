// AI Blog Writer — generates a full SEO-optimized article (2000-2500 words, ~10% keyword density)
// using Lovable AI Gateway (openai/gpt-5).
// Public endpoint (verify_jwt = false in supabase/config.toml is the project default).

import { callAIGateway } from "../_shared/aiGateway.ts";
import { getCredential } from "../_shared/getCredential.ts";
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
    const GEMINI_API_KEY = (await getCredential("GEMINI_API_KEY"));
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const brief = (await req.json()) as BlogBrief;
    if (!brief?.title || !brief?.targetKeyword) {
      return new Response(
        JSON.stringify({ error: "title and targetKeyword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wmin = Math.max(300, brief.wordCountMin ?? 2500);
    const wmax = Math.max(wmin, brief.wordCountMax ?? 3500);
    // 10% literal density is keyword-stuffing and hurts SEO. Cap at 3% (Google-safe natural range).
    const density = Math.min(brief.keywordDensityPct ?? 2, 3);
    const targetKw = brief.targetKeyword.trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const _now = new Date();
    const _yr = _now.getFullYear();
    const dateCtx = brief.contentDateContext?.trim() ||
      `Use only the most recent verified data (${_yr}-${_yr + 1} admission cycle, ${_yr - 1}-${_yr} placement reports). All dates, exam cycles, fees, cutoffs and statistics MUST reflect the latest available year. Do NOT use outdated 2020-2023 figures unless explicitly historical context. Today is ${_now.toISOString().slice(0, 10)}.`;

    // Approx target keyword occurrences.
    const targetWords = Math.round((wmin + wmax) / 2);
    const targetOccurrences = Math.round((targetWords * density) / 100);
    // Dynamic structural targets — scale with article length
    const targetH2 = Math.max(8, Math.min(20, Math.round(targetWords / 280)));
    const minWordsPerSection = 250;

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
- Valid HTML using only these tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>. Do NOT include <html>, <head>, <body>, <h1>, or markdown fences. NO inline style="", NO <font>, NO class/id attributes — plain semantic HTML only so typography stays uniform.

# CRITICAL OUTPUT HYGIENE
- NEVER write the literal characters "\\n", "\n", "/n", "\\t" or any visible escape sequence inside any field. Use real <p>, <br>, <li> tags or actual line breaks — the frontend renders "\\n" as raw text and breaks the page.
- Do NOT wrap output in markdown code fences. Return clean JSON via the tool call.

# DEEP-RESEARCH MODE (RESEARCH-FIRST)
- Before writing each section, mentally verify facts against the most authoritative public sources (NIRF, official school placement reports, exam-conducting body notifications, AICTE/NAAC). Every paragraph must add concrete data, named recruiters/colleges, real numbers or specific dates — never shallow filler.`;

    const userPrompt = `Write a complete, ready-to-publish, advanced SEO blog article that can rank on page 1 of Google for "${targetKw}" in India.

# BRIEF
- Working title: ${brief.title}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(derive 8-12 high-intent secondary + LSI keywords yourself based ONLY on this specific topic — never reuse generic MBA terms unrelated to the topic)"}
- Category: ${brief.category || "news"}
- Date context: ${dateCtx}

# TOPIC-SPECIFIC SEO LOCK (CRITICAL — NON-NEGOTIABLE)
This article is about "${brief.title}". EVERY keyword, internal link, anchor text, recruiter name, college mention, exam reference, statistic and example MUST be 100% specific to THIS topic. Do NOT use generic MBA filler that could apply to any other blog.
- If the topic is "IIM Ahmedabad Placement Report" → keywords, recruiters, packages, internal links, anchor text MUST all reference IIM Ahmedabad specifically (PGP, ABM, FABM, IIM-A campus, IIM-A recruiters, IIM-A median package, IIM-A summer placements). DO NOT mention IIM Bangalore/Calcutta/Lucknow data unless directly comparing.
- If the topic is "CAT 2026 Syllabus" → keywords and links MUST be CAT-specific (CAT VARC, CAT QA, CAT DILR, CAT exam pattern, CAT mock tests). Do NOT pad with XAT/NMAT/SNAP unless drawing a direct contrast.
- If the topic is a city/region (e.g. "MBA in Bangalore") → use Bangalore-specific colleges, recruiters, fees, ROI.
- Two blogs on DIFFERENT topics from this platform must never share the same keyword set, the same internal-link list, or the same recruiter/college roster. Uniqueness per topic is mandatory.

# INTERNAL LINKS — DERIVE FROM THE TOPIC (NOT A FIXED LIST)
Build 6-10 contextual internal links by INFERRING the most relevant URLs on bschoolbuzz.com / mbacompass.in for THIS exact topic. Use these URL patterns:
- College pages: <a href="/college/<college-slug>"> (e.g. /college/iim-ahmedabad, /college/xlri-jamshedpur)
- Exam pages: <a href="/exams/<exam-slug>"> (e.g. /exams/cat, /exams/xat, /exams/nmat, /exams/snap, /exams/iift, /exams/cmat, /exams/mat, /exams/micat)
- City pages: <a href="/colleges-in/<city-slug>"> (e.g. /colleges-in/bangalore, /colleges-in/mumbai)
- Category pages: <a href="/category/<slug>"> (e.g. /category/placements, /category/exam-tips)
- Coaching: <a href="/coaching/<institute-slug>"> or <a href="/coaching">
- Tools: /profile-analyzer, /mba-roi-calculator, /college-shortlister, /mba-compass, /mocks
- Related blogs: <a href="/blog/<related-topic-slug>"> — invent 2-3 closely related blog slugs derived from this topic
Anchor text MUST be descriptive and keyword-rich, varying per link, never "click here" or "read more". Each link must be CONTEXTUALLY relevant to the surrounding sentence — never bolt-on.

# HARD RULES — WORD COUNT & SECTION DEPTH (NON-NEGOTIABLE)
1. **WORD COUNT: ${wmin}-${wmax} words minimum** in (intro + content) plain text. Articles below ${wmin} words will be REJECTED. Count as you write; expand body sections rather than truncating. Never stop early.
2. **Section depth — EVERY <h2> section MUST be ${minWordsPerSection}-500 words** of detailed, substantive content. NO section may be just 2-3 lines or a single short paragraph. Every section must include:
   - A direct-answer opening paragraph
   - 2-4 supporting paragraphs OR bullet/numbered lists
   - At least one concrete example, named entity, or data point specific to "${targetKw}"
   - Where relevant: a comparison table, a numbered checklist, or a contextual internal link
3. **Keyword density**: primary keyword "${targetKw}" must appear ~${targetOccurrences} times (~${density}%, Google-safe). Use exact match in title, H1, first 100 words, ≥3 H2s, meta title, meta description, slug, conclusion. Weave 15-30 LSI/semantic variants specific to this topic.
4. **MANDATORY OPENING — TL;DR SUMMARY**: First element of "intro" MUST be <p><strong>Quick Summary:</strong> ...</p> giving a 60-90 word direct answer.
5. **NEVER START WITH A QUESTION**. All H2s and paragraph openers must be declarative (FAQ section excepted).
6. **HUMANIZED LANGUAGE — 8th grade level**. Contractions OK. BANNED: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving", "in today's fast-paced world", "it's worth noting", "look no further".
7. Short paragraphs (2-5 sentences). Use lists. **At least 3 HTML <table> blocks** (each 4+ rows of REAL ${currentYear} data specific to this topic — fees, packages, cutoffs, year-on-year trends, recruiter-wise hiring, etc.).
8. **STRUCTURE — REQUIRED ORDER**:
   a. Quick Summary <p>
   b. 2-3 paragraph hook stating problem + answer + who this guide is for
   c. **${targetH2}+ <h2> sections** (each ${minWordsPerSection}-500 words, 1-2 <h3> subsections where useful). Cover the full entity graph of THIS topic — eligibility, process, timelines, fees, ROI, comparisons, recruiters, alumni outcomes, common mistakes, expert tips, year-on-year trends, regional/segment breakdowns, alternatives.
   d. <h2>Key Takeaways</h2> — 6-8 bullets, each starting with <strong>Bold lead phrase:</strong>
   e. <h2>Frequently Asked Questions</h2> — **8-12 Q&A** (Q in <h3> ending with "?", A in <p>, 50-100 words each). Questions MUST mirror real People-Also-Ask queries for THIS topic.
   f. Final CTA paragraph with 2 topic-relevant internal links
9. **ADVANCED ON-PAGE SEO**:
   - Primary keyword in: first 100 words, ≥3 <h2> headings, last paragraph, meta title, meta description, slug, excerpt.
   - **Semantic SEO**: cover the topic's full entity graph specific to THIS subject only.
   - **LSI/NLP keywords**: 20-30 semantically related terms derived from THIS topic.
   - **External authority mentions** (plain text, no fabricated URLs): cite the AUTHORITATIVE sources for THIS specific topic (e.g. for IIM-A placement → IIM Ahmedabad official PR ${currentYear - 1}-${String(currentYear).slice(-2)}; for CAT → IIM-conducting-institute CAT ${currentYear} notification; for NIRF data → NIRF ${currentYear}).
   - **Featured-snippet bait**: ≥1 direct-answer <p> right under an <h2>, ≥1 numbered <ol> step-by-step list, ≥1 comparison <table>.
   - **E-E-A-T signals**: cite specific [src:Source Year] markers; name REAL recruiters & B-schools relevant to THIS topic only.
   - <strong> on 10-20 high-value phrases. <em> sparingly.
10. **FORMATTING POLISH**: Bold lead 2-4 words of important paragraphs. <h2> 4-9 words, benefit-driven. No ALL-CAPS.
11. Real, current Indian MBA ecosystem data: CAT ${currentYear} dates, NIRF ${currentYear} rankings, ${currentYear - 1}-${String(currentYear).slice(-2)} placement averages. Use only figures relevant to THIS topic.
12. NEVER fabricate implausible numbers. Realistic ${currentYear - 1}-${currentYear} ranges only.
13. NO <h1> — title rendered separately.

# OUTPUT FORMAT (return JSON via the tool call)
- title: refined title (≤ 65 chars), MUST contain primary keyword + a power word (best, complete, ${currentYear}, guide, ultimate). MUST NOT end with "?".
- slug: URL slug, lowercase-hyphenated (≤ 70 chars), MUST contain primary keyword.
- metaTitle: ≤ 60 chars, primary keyword near front, ends with "| MBA Compass" if it fits, no "?".
- metaDescription: 145-160 chars, primary keyword in first 120 chars, declarative.
- excerpt: 1-2 sentences, plain text, 160-220 chars, declarative, contains primary keyword.
- intro: opening HTML — Quick Summary <p> first, then 2-3 hook paragraphs. No headings inside intro.
- content: FULL article body as HTML (everything AFTER the intro, no <h1>), including ${targetH2}+ deep H2 sections, Key Takeaways, FAQ, final CTA.
- h1Tag: on-page H1 (declarative, ≤ 70 chars, contains primary keyword, no "?").
- keywords: array of **15-20 keywords** UNIQUE to this topic — primary keyword first, then 6-8 short-tail (2-3 words), then 8-12 long-tail (4+ words, question/intent-driven). NEVER generic MBA terms unrelated to "${targetKw}".
- primaryKeyword: echo "${targetKw}".
- wordCount: integer — your accurate count of (intro + content). MUST be ≥ ${wmin}.
- keywordOccurrences: integer — exact-match count of "${targetKw}".
- author: byline like "MBA Compass Editorial".`;

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

    // Scale tokens with target word count: ~2 tokens/word for output + generous reasoning overhead.
    // Cap at 64K so very long articles (10K+ words) don't truncate.
    const dynamicMaxTokens = Math.min(64000, Math.max(16000, Math.round(wmax * 4) + 4000));

    const aiRes = await callAIGateway({
        model: "openai/gpt-5",
        max_tokens: dynamicMaxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_blog_article" } },
      }, { feature: "ai-blog-writer" });

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

    // Strip stray "\n" / "\\n" / "/n" escape artifacts the model sometimes leaks as visible text.
    const stripEscapeArtifacts = (s: string): string =>
      String(s)
        .replace(/\\+n/gi, " ")
        .replace(/(^|[\s>])\/n(?=[\s<]|$)/gi, "$1 ")
        .replace(/<p>\s*(?:\\n|\/n|\s)*\s*<\/p>/gi, "")
        .replace(/<li>\s*(?:\\n|\/n|\s)*\s*<\/li>/gi, "")
        .replace(/[ \t]{2,}/g, " ");
    for (const k of ["intro", "content"]) {
      if (typeof article[k] === "string") article[k] = stripEscapeArtifacts(article[k]);
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

    // ── EXPANSION PASS: if the article came back short, ask the model to expand it
    //    by adding 2-3 deeper H2 sections + richer FAQ until we cross wmin words.
    if (actualWords < wmin && actualWords > 200) {
      const wordsNeeded = wmin - actualWords + 200;
      console.log(`Expansion pass: ${actualWords} < ${wmin}, asking for +${wordsNeeded} words`);
      try {
        const expandRes = await callAIGateway({
          model: "openai/gpt-5",
          max_tokens: 12000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `The previous draft was only ${actualWords} words but the brief required ${wmin}-${wmax}. Expand the article by adding ${wordsNeeded}+ words of new substance: 2-3 NEW <h2> sections covering angles not yet discussed (e.g. common mistakes, real student stories, year-on-year trends, ROI math, alternatives, expert tips, region-wise breakdown), plus 2-3 additional FAQ Q&A. Return the COMPLETE merged article (intro + content) re-rendered with the new sections inserted in logical places — do not just append. Maintain all hard rules from the original brief: ${targetKw}, ${density}% density, declarative headings, real ${currentYear} data, no banned phrases.\n\nCURRENT INTRO:\n${article.intro}\n\nCURRENT CONTENT:\n${article.content}` },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "publish_blog_article" } },
        }, { feature: "ai-blog-writer-expand" });
        if (expandRes.ok) {
          const ej = await expandRes.json();
          const ea = ej?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (ea) {
            const expanded = JSON.parse(ea);
            for (const k of ["intro", "content"]) {
              if (typeof expanded[k] === "string") expanded[k] = stripEscapeArtifacts(expanded[k]);
            }
            const expPlain = `${expanded.intro || ""} ${expanded.content || ""}`.replace(/<[^>]*>/g, " ");
            const expWords = expPlain.split(/\s+/).filter(Boolean).length;
            if (expWords > actualWords) {
              article = { ...article, ...expanded };
            }
          }
        }
      } catch (e) {
        console.error("Expansion pass failed (non-fatal):", e);
      }
    }

    // Recompute final stats after possible expansion
    const finalPlain = `${article.intro || ""} ${article.content || ""}`.replace(/<[^>]*>/g, " ");
    const finalWords = finalPlain.split(/\s+/).filter(Boolean).length;
    const finalOccurrences = (finalPlain.match(re) || []).length;
    const finalDensity = finalWords ? +((finalOccurrences * targetKw.split(/\s+/).length) / finalWords * 100).toFixed(2) : 0;

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
          actualWords: finalWords,
          targetDensityPct: density,
          actualDensityPct: finalDensity,
          actualOccurrences: finalOccurrences,
          targetOccurrences,
          expanded: finalWords > actualWords,
          firstPassWords: actualWords,
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
