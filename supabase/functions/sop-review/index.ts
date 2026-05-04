import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a top-tier admissions consultant evaluating Statements of Purpose (SOPs) for elite global programs (IIM-A/B/C, ISB, Harvard, Stanford, Wharton, INSEAD, LBS, MIT Sloan).

EVALUATION PHILOSOPHY:
- Be brutally honest. Do NOT inflate scores.
- Every comment must be SPECIFIC to the SOP text — quote phrases, point to lines.
- Avoid generic platitudes ("good job", "well written"). Replace with concrete observations.
- Pair every weakness with a precise, actionable fix.
- Never write long flowery paragraphs. Use crisp, dense, bullet-style insight.
- Quantify wherever possible: word counts, ratios, repetition counts, sentence length, cliche counts.

OUTPUT MUST BE QUANTITATIVE + QUALITATIVE:
- Section scores out of 10 (integers)
- Overall score out of 100
- SWOT analysis (each item ≤ 18 words)
- Quantitative metrics (numbers, percentages)
- Line-level issues (real quotes from the SOP)
- Improvement suggestions (specific, ≤ 20 words each)
- Rewrite suggestions (1-2 short rewritten sentences max per item)

RULES:
- Return ONLY the structured tool call. No prose, no markdown, no preamble.
- Bullets, not paragraphs. Short, punchy, scannable.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_sop_evaluation",
    description: "Return a fully structured, quantitative + qualitative SOP evaluation.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "integer", minimum: 0, maximum: 100 },
        verdict: { type: "string", enum: ["Excellent", "Good", "Needs Improvement", "Poor"] },
        one_line_summary: { type: "string", description: "≤ 25 words. The single most important takeaway." },

        section_scores: {
          type: "object",
          properties: {
            clarity: { type: "integer", minimum: 0, maximum: 10 },
            structure: { type: "integer", minimum: 0, maximum: 10 },
            storytelling: { type: "integer", minimum: 0, maximum: 10 },
            career_goals: { type: "integer", minimum: 0, maximum: 10 },
            college_fit: { type: "integer", minimum: 0, maximum: 10 },
            originality: { type: "integer", minimum: 0, maximum: 10 },
            grammar: { type: "integer", minimum: 0, maximum: 10 },
            impact: { type: "integer", minimum: 0, maximum: 10 },
          },
          required: ["clarity", "structure", "storytelling", "career_goals", "college_fit", "originality", "grammar", "impact"],
          additionalProperties: false,
        },

        quantitative_metrics: {
          type: "object",
          properties: {
            word_count: { type: "integer" },
            sentence_count: { type: "integer" },
            avg_sentence_length: { type: "number" },
            readability_grade: { type: "number", description: "Approx Flesch-Kincaid grade level" },
            cliche_count: { type: "integer" },
            passive_voice_pct: { type: "number" },
            unique_word_ratio: { type: "number", description: "0-1, lexical diversity" },
            first_person_pct: { type: "number" },
            paragraph_count: { type: "integer" },
            estimated_reading_time_min: { type: "number" },
          },
          required: ["word_count", "sentence_count", "avg_sentence_length", "readability_grade", "cliche_count", "passive_voice_pct", "unique_word_ratio", "first_person_pct", "paragraph_count", "estimated_reading_time_min"],
          additionalProperties: false,
        },

        swot: {
          type: "object",
          properties: {
            strengths: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            weaknesses: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            opportunities: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            threats: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
          },
          required: ["strengths", "weaknesses", "opportunities", "threats"],
          additionalProperties: false,
        },

        section_feedback: {
          type: "array",
          description: "Crisp bullet-style feedback per logical section of the SOP.",
          items: {
            type: "object",
            properties: {
              section: { type: "string", enum: ["Introduction", "Background", "Career Goals", "Why This Course", "Why This College", "Conclusion"] },
              score_out_of_10: { type: "integer", minimum: 0, maximum: 10 },
              verdict: { type: "string", description: "≤ 8 words" },
              bullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5, description: "Each bullet ≤ 22 words, specific." },
            },
            required: ["section", "score_out_of_10", "verdict", "bullets"],
            additionalProperties: false,
          },
          minItems: 4,
          maxItems: 6,
        },

        line_level_issues: {
          type: "array",
          description: "Specific problematic lines lifted from the SOP with fix.",
          items: {
            type: "object",
            properties: {
              quote: { type: "string", description: "Real quote from SOP" },
              issue: { type: "string", description: "≤ 18 words" },
              suggestion: { type: "string", description: "≤ 22 words, concrete fix" },
              severity: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["quote", "issue", "suggestion", "severity"],
            additionalProperties: false,
          },
          minItems: 3,
          maxItems: 10,
        },

        improvement_suggestions: {
          type: "array",
          items: { type: "string", description: "≤ 20 words, action-oriented" },
          minItems: 5,
          maxItems: 10,
        },

        rewrite_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              section: { type: "string" },
              original_excerpt: { type: "string" },
              rewritten: { type: "string", description: "≤ 60 words" },
              why_better: { type: "string", description: "≤ 18 words" },
            },
            required: ["section", "original_excerpt", "rewritten", "why_better"],
            additionalProperties: false,
          },
          minItems: 2,
          maxItems: 5,
        },

        college_fit_analysis: {
          type: "object",
          properties: {
            alignment_score: { type: "integer", minimum: 0, maximum: 100 },
            matches: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
            gaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
          },
          required: ["alignment_score", "matches", "gaps"],
          additionalProperties: false,
        },

        red_flags: {
          type: "array",
          items: { type: "string", description: "≤ 18 words" },
          maxItems: 6,
        },
      },
      required: [
        "overall_score", "verdict", "one_line_summary",
        "section_scores", "quantitative_metrics", "swot",
        "section_feedback", "line_level_issues", "improvement_suggestions",
        "rewrite_suggestions", "college_fit_analysis", "red_flags",
      ],
      additionalProperties: false,
    },
  },
};

async function runEvaluation(supabase: any, reviewId: string, review: any) {
  try {
    const wordCount = (review.sop_text || "").trim().split(/\s+/).filter(Boolean).length;

    const studentContext = {
      target_colleges: review.target_colleges || "(not provided)",
      country_preference: review.country_preference || "(not provided)",
      target_course: review.target_course || "MBA",
      specialization: review.specialization || "(not provided)",
      why_course: review.why_course || "(not provided)",
      experience_years: review.experience_years ?? "(not provided)",
      current_role: review.current_role_text || "(not provided)",
      academic_background: review.academic_background || "(not provided)",
      major_achievements: review.major_achievements || "(not provided)",
      short_term_goals: review.short_term_goals || "(not provided)",
      long_term_goals: review.long_term_goals || "(not provided)",
      why_college: review.why_college || "(not provided)",
      strengths: review.strengths || "(not provided)",
      weaknesses: review.weaknesses || "(not provided)",
      highlight_focus: review.highlight_focus || [],
      tone_preference: review.tone_preference || "Formal",
    };

    const userPrompt = `STUDENT PROFILE & INTENT:
${JSON.stringify(studentContext, null, 2)}

SOP CONTENT (${wordCount} words):
"""
${review.sop_text}
"""

Evaluate this SOP rigorously. Be specific, quantitative, and actionable. Use the submit_sop_evaluation function.`;

    const OPENAI_API_KEY = (await getCredential("OPENAI_API_KEY"));
    if (!OPENAI_API_KEY) {
      await supabase.from("sop_reviews").update({ status: "failed", error_message: "OpenAI not configured" }).eq("id", reviewId);
      return;
    }

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_sop_evaluation" } },
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      await supabase.from("sop_reviews").update({ status: "failed", error_message: `AI error ${aiResp.status}: ${errText.slice(0, 200)}` }).eq("id", reviewId);
      return;
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiJson).slice(0, 500));
      await supabase.from("sop_reviews").update({ status: "failed", error_message: "No structured response" }).eq("id", reviewId);
      return;
    }

    let evaluation: any;
    try {
      evaluation = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      await supabase.from("sop_reviews").update({ status: "failed", error_message: "Invalid AI JSON" }).eq("id", reviewId);
      return;
    }

    await supabase.from("sop_reviews").update({
      status: "completed",
      ai_response: evaluation,
      overall_score: evaluation.overall_score,
      error_message: null,
    }).eq("id", reviewId);
  } catch (e) {
    console.error("Background evaluation error:", e);
    await supabase.from("sop_reviews").update({
      status: "failed",
      error_message: e instanceof Error ? e.message : "Unknown error",
    }).eq("id", reviewId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { reviewId } = await req.json();
    if (!reviewId) {
      return new Response(JSON.stringify({ error: "reviewId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: review, error: rErr } = await supabase
      .from("sop_reviews").select("*").eq("id", reviewId).eq("user_id", user.id).single();
    if (rErr || !review) {
      return new Response(JSON.stringify({ error: "Review not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const wordCount = (review.sop_text || "").trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 200) {
      await supabase.from("sop_reviews").update({ status: "failed", error_message: "SOP too short (min 200 words)" }).eq("id", reviewId);
      return new Response(JSON.stringify({ error: "SOP too short. Please provide at least 200 words." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("sop_reviews").update({ status: "processing" }).eq("id", reviewId);

    // Kick off the AI evaluation in the background and return immediately.
    // The client polls sop_reviews.status until "completed" or "failed".
    // @ts-ignore EdgeRuntime is provided by Supabase Edge runtime
    EdgeRuntime.waitUntil(runEvaluation(supabase, reviewId, review));

    return new Response(JSON.stringify({ success: true, status: "processing", reviewId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sop-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
