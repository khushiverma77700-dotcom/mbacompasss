// AI Expand Content — when a page's main content is under the SEO minimum
// (~800 words), this function regenerates a long, well-formatted, SEO-friendly
// HTML body in the SAME structural pattern (H2 → H3 → bullet lists → bold
// keywords → FAQs) and writes it back to the appropriate column for that
// content type.
//
// Called automatically by the AI SEO Auto-Fix pipeline after suggestions are
// generated, but also exposed as a standalone endpoint for the admin "Expand
// Content" button.
//
// Tables / columns it writes to:
//   articles    → content
//   institutes  → description
//   colleges    → description
//   exams       → description
//   courses     → description
//   categories  → description
//   city_pages  → detailed_content

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABLE_MAP: Record<string, { table: string; column: string; pathPrefix: string }> = {
  article: { table: "articles", column: "content", pathPrefix: "/article" },
  institute: { table: "institutes", column: "description", pathPrefix: "/institute" },
  college: { table: "colleges", column: "description", pathPrefix: "/college" },
  exam: { table: "exams", column: "description", pathPrefix: "/exam" },
  course: { table: "courses", column: "description", pathPrefix: "/course" },
  category: { table: "categories", column: "description", pathPrefix: "/category" },
  cityPage: { table: "city_pages", column: "detailed_content", pathPrefix: "/colleges" },
};

const MIN_WORDS = 800;

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const wordCount = (html: string) => stripHtml(html || "").split(/\s+/).filter(Boolean).length;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contentType, recordId, data, force } = await req.json();
    if (!contentType || !TABLE_MAP[contentType]) {
      return new Response(JSON.stringify({ error: "Invalid contentType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!recordId) {
      return new Response(JSON.stringify({ error: "recordId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = TABLE_MAP[contentType];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull the existing row so we know what to expand and what to keep.
    const { data: row, error: rowErr } = await supabase
      .from(cfg.table)
      .select("*")
      .eq("id", recordId)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merged = { ...row, ...(data || {}) };
    const existing = merged[cfg.column] || "";
    const wc = wordCount(existing);

    if (!force && wc >= MIN_WORDS) {
      return new Response(JSON.stringify({
        skipped: true, reason: "content_already_long", wordCount: wc, threshold: MIN_WORDS,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const name = merged.title || merged.name || merged.full_name || "this page";
    const city = merged.city || "";
    const state = merged.state || "";
    const category = merged.category || merged.tier || merged.type || "";

    const systemPrompt = `You are an expert SEO content writer for the Indian MBA admissions niche
(CAT, XAT, GMAT, SNAP, NMAT, IIFT, CMAT, MAT). You write for MBA Compass —
a professional advisor brand. Your tone is calm, expert, never hype, never
emoji.

Your job: produce LONG-FORM, SEO-friendly HTML content that follows a strict
formatting pattern so it renders cleanly in TipTap and prose styles:

STRUCTURE (in this order):
1. <h2>Overview of …</h2>  (2-3 short paragraphs, opens with primary keyword)
2. <h2>Key Highlights</h2> + <ul><li><strong>Label:</strong> value</li>…</ul>
3. <h2>Why … stands out</h2> with 2-3 paragraphs + <h3> sub-sections
4. <h2>Who is this for?</h2> with bulleted ideal-candidate profile
5. <h2>Curriculum / Programmes / Coverage</h2> with <h3> sub-headings + lists
6. <h2>Fees, Batches & Schedule</h2> with concrete numbers if known
7. <h2>Results & Track Record</h2> with bullet stats
8. <h2>How to Apply</h2> with numbered <ol> steps
9. <h2>Frequently Asked Questions</h2> with 5-6 <h3> Q + <p> A pairs
10. <h2>Final Verdict</h2> closing paragraph + clear CTA sentence

FORMATTING RULES (HARD):
- Output PLAIN HTML only. NO markdown. NO #. NO **. NO triple backticks.
- Use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <table> only.
- Bold keywords with <strong>, italics with <em>.
- 1000-1400 words total. NEVER under 850.
- Internal links use relative paths like /coaching, /colleges, /exam/cat,
  /college-finder, /profile-analyzer, /cat-score-calculator, /compare.
- DO NOT invent fake placement numbers, fake faculty names, fake testimonials.
  If a stat is not provided, speak qualitatively ("strong placement record",
  "experienced mentors") instead of inventing a digit.
- DO NOT write meta tags, JSON-LD, or HTML <head> elements — body only.
- Start the response directly with <h2>. No preamble, no closing notes.`;

    const userPrompt = `Generate the LONG-FORM body content for this page.

Page type: ${contentType}
Name: ${name}
${city ? `City: ${city}` : ""}
${state ? `State: ${state}` : ""}
${category ? `Category/Tier: ${category}` : ""}
${merged.slug ? `Slug: ${merged.slug}` : ""}
${merged.exam_date ? `Exam date: ${merged.exam_date}` : ""}
${merged.fees ? `Fees: ${merged.fees}` : ""}
${merged.ranking ? `Ranking: #${merged.ranking}` : ""}
${merged.placement_avg ? `Avg placement: ${merged.placement_avg}` : ""}
${merged.success_rate ? `Success rate: ${merged.success_rate}%` : ""}
${merged.mode ? `Mode: ${merged.mode}` : ""}
${merged.eligibility ? `Eligibility: ${merged.eligibility}` : ""}
${merged.duration ? `Duration: ${merged.duration}` : ""}
${merged.exams_accepted ? `Exams accepted: ${(merged.exams_accepted || []).join(", ")}` : ""}
${merged.courses ? `Courses: ${(merged.courses || []).join(", ")}` : ""}
${merged.top_recruiters ? `Top recruiters: ${(merged.top_recruiters || []).slice(0, 12).join(", ")}` : ""}

Existing short content (rewrite & expand, do NOT just paste):
"""
${stripHtml(existing).slice(0, 2500)}
"""

Now write the full SEO-optimized HTML body following the strict structure
described in the system prompt. Aim for 1100-1300 words. Begin with <h2>.`;

    const aiResp = await callAIGateway({
      model: "openai/gpt-4o-mini",
      max_tokens: 6000,
      reasoning: { effort: "low" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }, { provider: "openai-mini", feature: "ai-expand-content" });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("[ai-expand-content] AI gateway error:", aiResp.status, t.slice(0, 400));
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiResp.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    let html: string = aiJson.choices?.[0]?.message?.content || "";

    // Sanitize: strip markdown fences, leading "#"/"**" the model sometimes
    // sneaks in despite instructions.
    html = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .replace(/^#{1,6}\s+/gm, "")
      .trim();

    if (!html || wordCount(html) < 400) {
      return new Response(JSON.stringify({
        error: "AI returned content too short. Please retry.",
        preview: html.slice(0, 200),
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newWordCount = wordCount(html);

    // Persist back into the appropriate column.
    const updatePayload: Record<string, any> = { [cfg.column]: html };
    const { error: updateErr } = await supabase
      .from(cfg.table)
      .update(updatePayload)
      .eq("id", recordId);
    if (updateErr) {
      console.error("[ai-expand-content] DB update failed:", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      contentType,
      recordId,
      column: cfg.column,
      previousWordCount: wc,
      newWordCount,
      content: html,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[ai-expand-content] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
