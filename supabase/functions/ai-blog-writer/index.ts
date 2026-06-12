// AI Blog Writer — generates a full SEO-optimized article using Lovable AI Gateway.
// Admin-only: requires a valid auth token AND the 'admin' role. This is purely an
// internal content tool — leaving it open lets anyone drain AI credits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";
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

const json = (status: number, body: unknown) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
);

async function startBackgroundBlogJob(jobId: string, brief: BlogBrief, token: string) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-blog-writer`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...brief, runInline: true, jobId }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error(detail || `Background worker failed with HTTP ${resp.status}`);
    }
  } catch (e) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("ai_blog_generation_jobs").update({
      status: "failed",
      progress: 100,
      current_step: "Generation failed",
      error_message: e instanceof Error ? e.message.slice(0, 1000) : String(e).slice(0, 1000),
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let activeJobId: string | null = null;
  let adminForError: ReturnType<typeof createClient> | null = null;
  try {
    // --- Admin-only auth gate -------------------------------------------------
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --------------------------------------------------------------------------

    const brief = (await req.json()) as BlogBrief;
    const action = (brief as any)?.action;
    if (action === "status") {
      const requestedJobId = String((brief as any)?.jobId || "");
      if (!requestedJobId) return json(400, { error: "jobId is required" });
      const { data: job, error: jobError } = await adminClient
        .from("ai_blog_generation_jobs")
        .select("id,status,progress,current_step,error_message,article_id,stats,brief,created_at,updated_at,finished_at")
        .eq("id", requestedJobId)
        .maybeSingle();
      if (jobError) throw jobError;
      if (!job) return json(404, { error: "Blog generation job not found" });

      const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : 0;
      const stalled = ["queued", "running"].includes(String(job.status)) && Date.now() - updatedAt > 120_000;
      if (stalled) {
        await adminClient.from("ai_blog_generation_jobs").update({
          status: "queued",
          current_step: "Recovering stalled generation worker",
          progress: Math.max(10, Number(job.progress || 0)),
        }).eq("id", requestedJobId);
        EdgeRuntime.waitUntil(startBackgroundBlogJob(requestedJobId, job.brief as BlogBrief, token));
      }

      const { brief: _brief, ...safeJob } = job as any;
      return json(200, { success: true, job: safeJob });
    }

    const runInline = (brief as any)?.runInline === true;
    activeJobId = typeof (brief as any)?.jobId === "string" ? (brief as any).jobId : null;
    adminForError = adminClient;

    if (!runInline) {
      const cleanBrief = { ...(brief as any) };
      delete cleanBrief.action;
      delete cleanBrief.runInline;
      delete cleanBrief.jobId;
      const { data: job, error: jobError } = await adminClient
        .from("ai_blog_generation_jobs")
        .insert({
          user_id: userRes.user.id,
          status: "queued",
          progress: 5,
          current_step: "Queued for AI writing",
          brief: cleanBrief,
        })
        .select("id")
        .single();
      if (jobError) throw jobError;
      EdgeRuntime.waitUntil(startBackgroundBlogJob(job.id, cleanBrief as BlogBrief, token));
      return json(202, { success: true, jobId: job.id, status: "queued" });
    }

    if (!brief?.title || !brief?.targetKeyword) {
      return new Response(
        JSON.stringify({ error: "title and targetKeyword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (activeJobId) {
      await adminClient.from("ai_blog_generation_jobs").update({
        status: "running",
        progress: 15,
        current_step: "Researching topic and drafting article",
        started_at: new Date().toISOString(),
        error_message: null,
      }).eq("id", activeJobId);
    }


    // NO upper cap on word count — long-form (10K+) is fully supported via expansion loop.
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
    const targetH2 = Math.max(10, Math.min(30, Math.round(targetWords / 260)));
    const minWordsPerSection = 400;
    const minWordsPerFaq = 120;

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();

    const systemPrompt = `You are an expert SEO content writer specializing in MBA, PGP, PGDM and Masters-in-Management (MiM) content for the Indian audience. You write in a clear, friendly, HUMAN voice — like a smart senior mentor talking to a student. Plain English, short sentences, contractions allowed (you're, don't, it's). Avoid corporate jargon, avoid "In today's fast-paced world..." style fluff, avoid robotic AI phrasing.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY claim, table, list and stat MUST be filled with concrete, latest ${currentYear} data. NEVER use phrases like "data not available", "varies widely", "depends on the institute", "contact for details", "TBD". If you don't have an exact ${currentYear} figure, give a tight realistic ${currentYear - 1}-${currentYear} range (e.g. "INR 25-32 LPA", "98% placement rate", "5,000-7,000 seats").
- Tables MUST have real rows with real numbers — never empty cells, never "—", never "N/A".
- Recruiter lists, college lists, exam-pattern facts MUST be real and named — never placeholder.

# SCOPE LOCK — MBA / MASTERS IN MANAGEMENT ONLY (NON-NEGOTIABLE)
- Every article MUST stay strictly within MBA / PGP / PGDM / PGPM / MMS / MMM / EMBA / PGPX / PGCM / PGPBM / Executive MBA / 1-Year MBA / Masters in Management (MiM) topics, plus the entrance ecosystem that feeds them (CAT, XAT, NMAT, SNAP, CMAT, GMAT, MAT, IIFT, MICAT, MAH-CET).
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

# TOPIC-SPECIFIC SEO LOCK (CRITICAL — NON-NEGOTIABLE — UNIQUE PER BLOG)
This article is about "${brief.title}". EVERY keyword, internal link, external reference, anchor text, recruiter name, college mention, exam reference, statistic and example MUST be 100% specific to THIS exact topic. Generic MBA filler that could apply to any other blog is FORBIDDEN — it will be rejected.

Rules of uniqueness (apply ruthlessly):
- Derive the keyword set, internal-link set and citation set FROM the title "${brief.title}" itself. Do NOT reuse a generic "MBA blog" template.
- If the topic is "IIM Ahmedabad Placement Report ${currentYear}" → keywords, recruiters, packages, internal links, anchor text, citations MUST all reference IIM Ahmedabad specifically (PGP, ABM, FABM, IIM-A campus, IIM-A recruiters, IIM-A median package, IIM-A summer placements). DO NOT mention IIM Bangalore/Calcutta/Lucknow data unless drawing a direct named comparison.
- If the topic is "IIM Calcutta Placement Report" → use ONLY IIM-C-specific MBAex/PGP/PGDBA data, IIM-C recruiters, IIM-C Joka campus references. Never copy the IIM-A roster.
- If the topic is "CAT ${currentYear} Syllabus" → CAT-specific only (CAT VARC, CAT QA, CAT DILR, CAT exam pattern, CAT mock tests). Do NOT pad with XAT/NMAT/SNAP except for one explicit contrast paragraph.
- If the topic is a city/region (e.g. "MBA in Bangalore") → use Bangalore-specific colleges, recruiters, fees, ROI. No Delhi/Mumbai padding.
- If the topic is an exam (NMAT/XAT/SNAP/CMAT/IIFT) → use ONLY that exam's pattern, cutoffs, accepting institutes, prep strategy. Never bleed across exams.

# UNIQUENESS CONTRACT — TWO DIFFERENT BLOGS, ZERO OVERLAP
Two blogs on different topics from this platform must NEVER share:
- the same keyword set (keywords[] must be derived 100% from this title)
- the same internal-link list (links must point to entities named in this article)
- the same recruiter/college roster (only entities relevant to THIS topic)
- the same external citation sources (cite the authoritative source FOR THIS topic)
Treat the title as a hard scope-fence. If a fact does not belong to the topic, leave it out.

# INTERNAL LINKS — DERIVE 6-10 FROM THIS TOPIC ONLY (NOT A FIXED LIST)
Build 6-10 contextual internal links by INFERRING the most relevant URLs on mbacompass.in for THIS exact topic. Every internal link must mention an entity actually discussed in the surrounding paragraph. Use these URL patterns:
- College pages: <a href="/college/<college-slug>"> (e.g. /college/iim-ahmedabad, /college/xlri-jamshedpur) — only colleges named in THIS article
- Exam pages: <a href="/exams/<exam-slug>"> (e.g. /exams/cat, /exams/xat, /exams/nmat, /exams/snap, /exams/iift, /exams/cmat, /exams/mat, /exams/micat) — only exams relevant to THIS topic
- City pages: <a href="/colleges-in/<city-slug>"> (e.g. /colleges-in/bangalore, /colleges-in/mumbai) — only if the topic is geographic
- Category pages: <a href="/category/<slug>"> (e.g. /category/placements, /category/exam-tips) — choose the category that fits THIS topic
- Coaching: <a href="/coaching/<institute-slug>"> or <a href="/coaching"> — only if coaching is contextually relevant
- Tools: /profile-analyzer, /mba-roi-calculator, /college-shortlister, /mba-compass, /mocks — pick only the tool that helps the reader of THIS topic
- Related blogs: <a href="/blog/<related-topic-slug>"> — invent 2-3 closely related blog slugs derived from THIS title only
Anchor text MUST be descriptive and keyword-rich, varying per link, never "click here" or "read more". Each link must be CONTEXTUALLY relevant to the surrounding sentence — never bolt-on. Do NOT reuse the same set of links across different articles.

# EXTERNAL LINKS — STRICTLY FORBIDDEN
- DO NOT output any external <a href="http..."> or <a href="https..."> links anywhere in the article. ZERO outbound links.
- DO NOT output bare URLs (no "https://...", no "www....") inside paragraphs, tables, lists, citations or FAQs.
- The ONLY allowed <a href="..."> values are RELATIVE internal URLs that start with "/" on mbacompass.in (e.g. /college/iim-ahmedabad, /exams/cat, /blog/...).
- Authoritative sources must be cited as PLAIN TEXT only (e.g. "NIRF ${currentYear} Management Rankings", "IIM Ahmedabad official placement report ${currentYear - 1}-${String(currentYear).slice(-2)}") and/or as [src:Source Year] markers — never as clickable links, never with URLs.
- Any external link found in your output will be stripped and the article rejected. Internal-only linking, always.


# HARD RULES — WORD COUNT & SECTION DEPTH (NON-NEGOTIABLE)
1. **WORD COUNT: ${wmin}-${wmax} words minimum** in (intro + content) plain text. Articles below ${wmin} words will be REJECTED. Count as you write; expand body sections rather than truncating. Never stop early. Long-form 5,000-10,000+ word articles are fully supported — write the full requested length.
2. **Section depth — EVERY <h2> section MUST be ${minWordsPerSection}-700 words** of detailed, substantive content. ONE-LINER ANSWERS ARE STRICTLY FORBIDDEN. NO section may be just 1-3 short sentences, a single short paragraph, or a "summary-style" reply. Every <h2> section must include ALL of:
   - A direct-answer opening paragraph (60-100 words) that names the topic entity and gives the exact numeric/factual answer
   - 4-6 supporting paragraphs of detailed explanation, breakdowns, context, and analysis (each paragraph 50-90 words)
   - At least one bullet or numbered list (5+ items, each item a full sentence — NOT a 2-word fragment)
   - At least one concrete example, named entity, recruiter, college, package figure, exam date, or data point specific to "${targetKw}"
   - Either a comparison <table> with 5+ rows of real ${currentYear} numbers OR a numbered step-by-step checklist
   - 1-2 contextual internal links anchored to topic-relevant entities
   - At least one <h3> subsection (60-150 words) drilling into a sub-angle (eligibility, fees, cutoffs, recruiters, timeline, alternatives, mistakes, expert tips, etc.)
   - A short closing takeaway sentence in <strong> at the end of the section
3. **Keyword usage — NATURAL, NOT STUFFED** (Google spam policy compliance): primary keyword "${targetKw}" should appear roughly ${Math.max(3, Math.round(targetOccurrences * 0.6))} times across the full article (~${Math.max(0.5, +(density * 0.6).toFixed(2))}% density). Use exact match in title, H1, slug, meta title, meta description, the first 100 words, and the conclusion — that is enough. DO NOT force the exact keyword into multiple H2 headings; vary headings with synonyms, intent variations, and entity names. Weave 20-30 LSI/semantic variants naturally — never repeat the exact keyword in adjacent sentences.
4. **MANDATORY OPENING — TL;DR SUMMARY**: First element of "intro" MUST be <p><strong>Quick Summary:</strong> ...</p> giving a 60-90 word direct answer specific to "${brief.title}".
5. **NEVER START WITH A QUESTION**. All H2s and paragraph openers must be declarative (FAQ section excepted).
6. **HUMANIZED LANGUAGE — 8th grade level**. Contractions OK. BANNED: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving", "in today's fast-paced world", "it's worth noting", "look no further".
7. Short paragraphs (2-5 sentences). Use lists. **At least 5 HTML <table> blocks** (each 5+ rows of REAL ${currentYear} data specific to this topic — fees, packages, cutoffs, year-on-year trends, recruiter-wise hiring, sectoral splits, comparison vs peers, etc.). **At least 6 bullet/numbered lists** across the article.
8. **STRUCTURE — REQUIRED ORDER**:
   a. Quick Summary <p>
   b. 2-3 paragraph hook stating problem + answer + who this guide is for (all specific to THIS topic)
   c. **${targetH2}+ <h2> sections** (each ${minWordsPerSection}-700 words, 1-2 <h3> subsections). Cover the full entity graph of THIS topic — eligibility, process, timelines, fees, ROI, comparisons, recruiters, alumni outcomes, common mistakes, expert tips, year-on-year trends, regional/segment breakdowns, alternatives. Every section must be deep — NO shallow stubs, NO one-line answers.
   d. <h2>Key Takeaways</h2> — 8-10 bullets, each starting with <strong>Bold lead phrase:</strong> followed by 1-2 full sentences (15-30 words each).
   e. <h2>Frequently Asked Questions</h2> — **10-15 Q&A pairs**. Question in <h3> ending with "?"; Answer in ${minWordsPerFaq}-220 words across 2-3 <p> blocks PLUS at least one of {bullet list (4+ items), mini <table>, or numbered steps}. ONE-LINE FAQ ANSWERS ARE FORBIDDEN. Each answer must give exact figures, named entities, dates and a contextual internal link where relevant. Questions MUST mirror real People-Also-Ask queries for THIS specific topic.
   f. Final CTA paragraph with 2-3 topic-relevant internal links
9. **ADVANCED ON-PAGE SEO**:
   - Primary keyword in: title, H1, slug, meta title, meta description, excerpt, first 100 words, and last paragraph. Vary H2 headings with synonyms — do not stuff the exact keyword into multiple headings.
   - **Semantic SEO**: cover the topic's full entity graph specific to THIS subject only.
   - **LSI/NLP keywords**: 20-30 semantically related terms derived from THIS topic.
   - **External authority mentions** (plain text, no fabricated URLs): cite the AUTHORITATIVE sources for THIS specific topic (e.g. for IIM-A placement → IIM Ahmedabad official PR ${currentYear - 1}-${String(currentYear).slice(-2)}; for CAT → IIM-conducting-institute CAT ${currentYear} notification; for NIRF data → NIRF ${currentYear}).
   - **Featured-snippet bait**: ≥2 direct-answer <p> right under an <h2>, ≥1 numbered <ol> step-by-step list, ≥2 comparison <table>.
   - **E-E-A-T signals**: cite specific [src:Source Year] markers; name REAL recruiters & B-schools relevant to THIS topic only.
   - <strong> on 12-20 high-value phrases. <em> sparingly.
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

    // Scale tokens with target word count. Cap at 32K to stay within edge wall-clock limits.
    const dynamicMaxTokens = Math.min(32000, Math.max(12000, Math.round(wmax * 3) + 3000));

    // Try full gpt-5 first; fall back to gpt-5-mini on timeout / 5xx so the user
    // doesn't see "Edge Function returned a non-2xx status code".
    const callModel = async (model: string) => callAIGateway({
        model,
        max_tokens: dynamicMaxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_blog_article" } },
      }, { feature: "ai-blog-writer" });

    let aiRes: Response;
    try {
      aiRes = await callModel("openai/gpt-5");
      if (!aiRes.ok && aiRes.status >= 500) {
        console.warn("gpt-5 returned", aiRes.status, "— falling back to gpt-5-mini");
        aiRes = await callModel("openai/gpt-5-mini");
      }
    } catch (e) {
      console.warn("gpt-5 threw, falling back to gpt-5-mini:", e);
      aiRes = await callModel("openai/gpt-5-mini");
    }

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

    // ── EXPANSION LOOP: up to 5 passes to reach the word target for long-form articles (10K+ supported).
    let currentWords = actualWords;
    for (let pass = 1; pass <= 2 && currentWords < wmin && currentWords > 200; pass++) {
      const wordsNeeded = wmin - currentWords + 300;
      console.log(`Expansion pass ${pass}: ${currentWords} < ${wmin}, asking for +${wordsNeeded} words`);
      try {
        const expandRes = await callAIGateway({
          model: "openai/gpt-5-mini",
          max_tokens: Math.min(32000, Math.max(10000, Math.round(wmax * 3) + 3000)),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `The current draft is ${currentWords} words but the brief requires ${wmin}-${wmax}. Expand it by adding ${wordsNeeded}+ words of NEW substance specific to "${targetKw}": 3-5 NEW <h2> sections (each ${minWordsPerSection}-500 words) covering angles not yet discussed (e.g. year-on-year trends specific to this topic, common mistakes specific to this topic, alumni stories, ROI math, regional breakdown, expert tips, alternatives, deep comparison tables) plus 3-4 additional FAQ Q&A. Every new section MUST contain topic-specific data, named entities, examples, and at least one new internal link relevant to "${targetKw}" only. Return the COMPLETE merged article (intro + content) re-rendered with new sections woven into logical places — do not just append at the end. Maintain ALL hard rules: ${density}% density, declarative headings, real ${currentYear} data, no banned phrases, no generic MBA filler unrelated to this topic.\n\nCURRENT INTRO:\n${article.intro}\n\nCURRENT CONTENT:\n${article.content}` },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "publish_blog_article" } },
        }, { feature: "ai-blog-writer-expand" });
        if (!expandRes.ok) { console.warn(`Expand pass ${pass} HTTP ${expandRes.status}`); break; }
        const ej = await expandRes.json();
        const ea = ej?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!ea) break;
        const expanded = JSON.parse(ea);
        for (const k of ["intro", "content"]) {
          if (typeof expanded[k] === "string") expanded[k] = stripEscapeArtifacts(expanded[k]);
        }
        const expPlain = `${expanded.intro || ""} ${expanded.content || ""}`.replace(/<[^>]*>/g, " ");
        const expWords = expPlain.split(/\s+/).filter(Boolean).length;
        if (expWords > currentWords) {
          article = { ...article, ...expanded };
          currentWords = expWords;
        } else {
          break; // no progress — stop
        }
      } catch (e) {
        console.error(`Expansion pass ${pass} failed (non-fatal):`, e);
        break;
      }
    }

    // ── Strip any external links / bare URLs the model may have leaked in.
    // Keep ONLY relative <a href="/..."> internal links. Bare http(s)://… and www.… are removed.
    const stripExternalLinks = (html: string) => {
      if (!html) return html;
      let out = html;
      // Unwrap <a href="http..."> / <a href="//..."> / <a href="mailto:..."> / <a href="www...">
      out = out.replace(
        /<a\b[^>]*\bhref\s*=\s*["'](?:https?:\/\/|\/\/|mailto:|tel:|www\.)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
        "$1"
      );
      // Remove bare URLs in text (http://, https://, www.)
      out = out.replace(/\bhttps?:\/\/[^\s<>"')]+/gi, "");
      out = out.replace(/\bwww\.[^\s<>"')]+/gi, "");
      // Collapse any double-spaces left behind
      out = out.replace(/[ \t]{2,}/g, " ");
      return out;
    };
    article.intro = stripExternalLinks(article.intro || "");
    article.content = stripExternalLinks(article.content || "");

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

    const baseSlug = slug || String(brief.slug || targetKw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    let finalSlug = baseSlug;
    const { data: existingSlug } = await adminClient
      .from("articles")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (existingSlug?.id) finalSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    const insertPayload = {
      title: article.title || brief.title,
      slug: finalSlug,
      excerpt: article.excerpt || "",
      intro: article.intro || "",
      content: article.content || "",
      meta_title: article.metaTitle || brief.metaTitle || String(article.title || brief.title).slice(0, 60),
      meta_description: article.metaDescription || brief.metaDescription || String(article.excerpt || "").slice(0, 160),
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
      primary_keyword: targetKw,
      h1_tag: article.h1Tag || article.title || brief.title,
      author: article.author || "MBA Compass Editorial",
      category: brief.category || "news",
      status: "published",
      published: true,
      featured: false,
      priority: 0,
      faqs: extractedFaqs,
      last_seo_refresh: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await adminClient
      .from("articles")
      .insert(insertPayload)
      .select("id, slug")
      .single();
    if (insertError) throw insertError;

    if (extractedFaqs.length > 0 && inserted?.id) {
      try {
        const faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: extractedFaqs.map((f: any) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        };
        const snapshotKey = `seo_page__article__${inserted.id}`;
        const pagePath = `/article/${inserted.slug}`;
        await adminClient.from("site_settings").upsert({
          key: snapshotKey,
          value: {
            contentType: "article",
            recordId: inserted.id,
            slug: inserted.slug,
            pagePath,
            canonicalUrl: pagePath,
            faqs: extractedFaqs,
            schemaMarkup: [faqSchema],
            generatedAt: new Date().toISOString(),
          },
        }, { onConflict: "key" });
      } catch (faqError) {
        console.warn("FAQ schema snapshot failed (non-fatal):", faqError);
      }
    }

    const finalStats = {
      targetWordsRange: [wmin, wmax],
      actualWords: finalWords,
      targetDensityPct: density,
      actualDensityPct: finalDensity,
      actualOccurrences: finalOccurrences,
      targetOccurrences,
      expanded: finalWords > actualWords,
      firstPassWords: actualWords,
      insertedId: inserted.id,
    };

    if (activeJobId) {
      await adminClient.from("ai_blog_generation_jobs").update({
        status: "completed",
        progress: 100,
        current_step: "Article saved successfully",
        article_id: inserted.id,
        stats: finalStats,
        finished_at: new Date().toISOString(),
      }).eq("id", activeJobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        insertedId: inserted.id,
        slug: inserted.slug,
        faqCount: extractedFaqs.length,
        stats: finalStats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-blog-writer error:", e);
    if (activeJobId && adminForError) {
      await adminForError.from("ai_blog_generation_jobs").update({
        status: "failed",
        progress: 100,
        current_step: "Generation failed",
        error_message: e instanceof Error ? e.message.slice(0, 1000) : String(e).slice(0, 1000),
        finished_at: new Date().toISOString(),
      }).eq("id", activeJobId);
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
