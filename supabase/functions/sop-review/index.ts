import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert admission consultant specializing in SOP (Statement of Purpose) evaluation for top global universities (IIMs, ISB, Harvard, Stanford, Wharton, INSEAD, LBS, etc.).

Your task is to evaluate a student's SOP in a highly structured, unbiased, specific, and detailed manner.

Rules:
- Every feedback must be specific, never generic.
- Every weakness must be paired with an actionable improvement suggestion.
- Section scores must align with the qualitative feedback (do not give 9/10 then list major problems).
- Be honest. If the SOP is weak, score it low. If excellent, score it high.
- All scores: section_scores out of 10 (integers), overall_score out of 100.
- Never include markdown, never include preamble. Return ONLY the structured tool call.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_sop_evaluation",
    description: "Return a structured SOP evaluation report.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "integer", minimum: 0, maximum: 100 },
        verdict: { type: "string", enum: ["Excellent", "Good", "Needs Improvement", "Poor"] },
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
        strengths: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        weaknesses: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        detailed_feedback: {
          type: "object",
          properties: {
            introduction: { type: "string" },
            body: { type: "string" },
            career_goals: { type: "string" },
            conclusion: { type: "string" },
          },
          required: ["introduction", "body", "career_goals", "conclusion"],
          additionalProperties: false,
        },
        line_level_issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              quote: { type: "string" },
              issue: { type: "string" },
              suggestion: { type: "string" },
            },
            required: ["quote", "issue", "suggestion"],
            additionalProperties: false,
          },
        },
        improvement_suggestions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 10 },
        rewrite_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              section: { type: "string" },
              original_excerpt: { type: "string" },
              rewritten: { type: "string" },
            },
            required: ["section", "original_excerpt", "rewritten"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "overall_score", "verdict", "section_scores", "strengths", "weaknesses",
        "detailed_feedback", "line_level_issues", "improvement_suggestions", "rewrite_suggestions",
      ],
      additionalProperties: false,
    },
  },
};

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

    const studentContext = {
      target_colleges: review.target_colleges,
      country_preference: review.country_preference,
      deadline: review.deadline,
      experience_years: review.experience_years,
      current_role: review.current_role_text,
      academic_background: review.academic_background,
      major_achievements: review.major_achievements,
      target_course: review.target_course,
      specialization: review.specialization,
      why_course: review.why_course,
      short_term_goals: review.short_term_goals,
      long_term_goals: review.long_term_goals,
      why_college: review.why_college,
      strengths: review.strengths,
      weaknesses: review.weaknesses,
      highlight_focus: review.highlight_focus,
      tone_preference: review.tone_preference,
    };

    const userPrompt = `STUDENT PROFILE & INTENT (JSON):
${JSON.stringify(studentContext, null, 2)}

SOP CONTENT (${wordCount} words):
"""
${review.sop_text}
"""

Evaluate this SOP rigorously against the student's stated profile, target course/college, and intended highlights. Use the submit_sop_evaluation function.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      await supabase.from("sop_reviews").update({ status: "failed", error_message: "OpenAI not configured" }).eq("id", reviewId);
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      await supabase.from("sop_reviews").update({ status: "failed", error_message: `AI error ${aiResp.status}` }).eq("id", reviewId);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await supabase.from("sop_reviews").update({ status: "failed", error_message: "No structured response" }).eq("id", reviewId);
      return new Response(JSON.stringify({ error: "No structured response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const evaluation = JSON.parse(toolCall.function.arguments);

    await supabase.from("sop_reviews").update({
      status: "completed",
      ai_response: evaluation,
      overall_score: evaluation.overall_score,
      error_message: null,
    }).eq("id", reviewId);

    return new Response(JSON.stringify({ success: true, evaluation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sop-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
