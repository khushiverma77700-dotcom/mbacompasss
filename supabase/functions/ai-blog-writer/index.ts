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

    const wmin = brief.wordCountMin ?? 2200;
    const wmax = brief.wordCountMax ?? 2800;
    // 10% literal density is keyword-stuffing and hurts SEO. Cap at 2.5% (Google-safe natural range).
    const density = Math.min(brief.keywordDensityPct ?? 2, 2.5);
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
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(derive 6-10 high-intent secondary + LSI keywords yourself based on the topic and Indian MBA search intent)"}
- Category: ${brief.category || "news"}
- Date context: ${dateCtx}

# HARD RULES — WORD COUNT IS NON-NEGOTIABLE
1. **WORD COUNT: ${wmin}-${wmax} words minimum** in (intro + content) plain text. Articles below ${wmin} words will be REJECTED. Count as you write — if you are approaching the limit and still have FAQ/CTA pending, expand body sections with more depth, examples, mini-tables and lists rather than truncating. Never stop early.
2. **Keyword density**: primary keyword "${targetKw}" must appear ~${targetOccurrences} times (~${density}% — Google-safe natural range). Use exact match in title, H1, first 100 words, at least 2 H2s, meta title, meta description, URL slug, and conclusion. Use semantic variants (LSI keywords) liberally — Google's NLP rewards topical depth, not repetition.
3. **MANDATORY OPENING — TL;DR SUMMARY**: First element of "intro" MUST be <p><strong>Quick Summary:</strong> ...</p> giving a 55-75 word direct answer to the search intent. Featured-snippet optimized.
4. **NEVER START WITH A QUESTION**. Every <h2>, paragraph opener, and the first sentence after Quick Summary MUST be declarative. Headings can be topic phrases ("How to Crack CAT in 6 Months") but never end with "?" — except inside the FAQ section.
5. **HUMANIZED LANGUAGE — 8th grade reading level**. Use contractions, "you", real Indian examples, concrete numbers. Vary sentence length. BANNED phrases: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving", "in today's fast-paced world", "it's worth noting", "look no further". NO em-dash overuse.
6. Short paragraphs (2-4 sentences). Use bullet/numbered lists. **At least 2 HTML <table> blocks** (e.g. fees comparison + cutoff/placement comparison) with real ${currentYear} data and 4+ rows each.
7. **STRUCTURE — REQUIRED ORDER**:
   a. Quick Summary <p> (rule 3)
   b. 2-3 paragraph hook stating the problem + the answer + who this guide is for
   c. **8-12 <h2> sections** (more H2s = better topical coverage), each with 200-350 words and 1-2 <h3> subsections where useful
   d. <h2>Key Takeaways</h2> with 5-7 bullets, each starting with <strong>Bold lead phrase:</strong>
   e. <h2>Frequently Asked Questions</h2> with **6-10 Q&A** (each Q in <h3> ending with "?", A in <p>, 40-80 words each — long enough for FAQ rich-snippet eligibility)
   f. Final CTA paragraph with one or two internal links
8. **ADVANCED ON-PAGE SEO (build into HTML naturally)**:
   - Primary keyword in: first 100 words, ≥3 <h2> headings, last paragraph, meta title, meta description, slug, excerpt.
   - **Semantic SEO / Topical depth**: cover the topic's full entity graph — related exams, programs, colleges, fee bands, eligibility, timeline, prep strategy, recruiters, ROI, alternatives, common mistakes. Google rewards comprehensive coverage.
   - **LSI / NLP keywords**: weave in 15-25 semantically related terms (e.g. for "MBA in India": CAT percentile, NIRF ranking, IIM placements, tier-1 B-school, return on investment, GD-PI-WAT, work experience, GMAT, executive MBA, specialization).
   - **People Also Ask coverage**: the FAQ section MUST answer the actual queries users type into Google for this topic. Think about what a CAT aspirant, MBA candidate, or working professional would search.
   - **Internal links**: 5-8 contextual <a href="..."> using these real site URLs where relevant: <a href="/colleges">top MBA colleges</a>, <a href="/coaching">CAT coaching institutes</a>, <a href="/exams/cat">CAT exam</a>, <a href="/exams/xat">XAT exam</a>, <a href="/exams/nmat">NMAT</a>, <a href="/exams/snap">SNAP</a>, <a href="/profile-analyzer">free Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/college-shortlister">College Shortlister</a>, <a href="/mba-compass">MBA Compass courses</a>, <a href="/mocks">free CAT mocks</a>, <a href="/blog">MBA blog</a>. Use descriptive, keyword-rich anchor text — never "click here".
   - **External authority mentions** (1-3 in plain text only, no fabricated URLs): NIRF, AICTE, IIM Bangalore Placement Report ${currentYear - 1}-${String(currentYear).slice(-2)}, CAT ${currentYear} notification, etc.
   - **Featured snippet bait**: include at least one direct-answer <p> right under an <h2>, plus one numbered <ol> "step-by-step" list, plus one comparison <table>.
   - **E-E-A-T signals**: cite specific sources via [src:Source Year] markers, name real recruiters (McKinsey, BCG, Bain, Amazon, Microsoft, Goldman Sachs, ICICI, HUL, Accenture, Deloitte, Flipkart), name real B-schools (IIM-A/B/C/L/I/K, XLRI, FMS, MDI, SPJIMR, ISB, NMIMS, IIFT, JBIMS, IMI, IMT, GLIM, Welingkar).
   - <strong> on 8-15 high-value phrases (keywords + key facts). <em> sparingly.
   - Semantic <ul>/<ol> for any enumeration of 3+ items.
9. **FORMATTING POLISH**: Bold the lead 2-4 words of important paragraphs for scannability. <h2> 4-9 words, benefit-driven. No ALL-CAPS.
10. Real, current Indian MBA ecosystem data: CAT ${currentYear} dates, NIRF ${currentYear} rankings, ${currentYear - 1}-${String(currentYear).slice(-2)} placement averages (IIM-A ~34 LPA, IIM-B ~35 LPA, IIM-C ~36 LPA, ISB ~35 LPA, XLRI ~32 LPA, FMS ~34 LPA, SPJIMR ~33 LPA, MDI ~26 LPA, NMIMS ~26 LPA), fee bands in lakhs.
11. NEVER fabricate implausible numbers. Use realistic ${currentYear - 1}-${currentYear} ranges.
12. NO <h1> — title is rendered separately.

# OUTPUT FORMAT (return JSON via the tool call)
- title: refined title (≤ 65 chars), MUST contain primary keyword + a power word (best, complete, ${currentYear}, guide, ultimate). MUST NOT end with "?".
- slug: URL slug, lowercase-hyphenated (≤ 70 chars), MUST contain primary keyword.
- metaTitle: ≤ 60 chars, primary keyword near the front, ends with "| MBA Compass" if it fits, no "?".
- metaDescription: 145-160 chars, primary keyword in first 120 chars, action verb + benefit + year + CTA, declarative.
- excerpt: 1-2 sentences, plain text, 160-220 chars, declarative, contains primary keyword.
- intro: opening HTML — Quick Summary <p> first, then 2-3 hook paragraphs. No headings inside intro.
- content: FULL article body as HTML (everything AFTER the intro, no <h1>), including 8-12 H2 sections, Key Takeaways, FAQ section, final CTA.
- h1Tag: on-page H1 (declarative, ≤ 70 chars, contains primary keyword, no "?").
- keywords: array of **12-18 keywords** — MUST include primary keyword first, then 5-7 short-tail (2-3 words), then 6-10 long-tail (4+ words, question-style or intent-driven).
- primaryKeyword: echo "${targetKw}".
- wordCount: integer — your accurate count of (intro + content) plain text words. MUST be ≥ ${wmin}.
- keywordOccurrences: integer — exact-match count of "${targetKw}" in (intro + content).
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

    const aiRes = await callAIGateway({
        model: "openai/gpt-5",
        // 2200-2800 word article needs ~4-5K output tokens. With gpt-5 reasoning
        // overhead, give a generous 16K budget so the article never truncates.
        max_tokens: 16000,
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
