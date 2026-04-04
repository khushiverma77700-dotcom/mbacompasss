import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileInput {
  name: string;
  email: string;
  tenth_score: number;
  twelfth_score: number;
  graduation_score: number;
  graduation_stream: string;
  is_pursuing_graduation: boolean;
  work_experience_months: number;
  category: string;
  gender?: string;
  target_exams: string[];
  target_colleges: string[];
  preferred_specialization?: string;
  target_states: string[];
  phone?: string;
}

function calculateProfileScore(p: ProfileInput): number {
  const tenthNorm = Math.min(p.tenth_score, 100) / 100;
  const twelfthNorm = Math.min(p.twelfth_score, 100) / 100;
  const gradNorm = Math.min(p.graduation_score, 100) / 100;

  let workScore = 0;
  if (p.work_experience_months >= 36) workScore = 1.0;
  else if (p.work_experience_months >= 24) workScore = 0.85;
  else if (p.work_experience_months >= 12) workScore = 0.6;
  else if (p.work_experience_months >= 6) workScore = 0.35;
  else workScore = 0.15;

  const categoryWeight: Record<string, number> = {
    General: 0.5, OBC: 0.6, "OBC-NCL": 0.65, SC: 0.75, ST: 0.8, EWS: 0.6, PwD: 0.8,
  };
  const catScore = categoryWeight[p.category] || 0.5;

  const streamBonus: Record<string, number> = {
    Engineering: 0.75, Commerce: 0.65, Science: 0.65, Arts: 0.5, Medical: 0.6, Law: 0.55, Other: 0.5,
  };
  const extraScore = streamBonus[p.graduation_stream] || 0.5;

  const score =
    tenthNorm * 0.15 + twelfthNorm * 0.15 + gradNorm * 0.2 +
    workScore * 0.2 + catScore * 0.1 + extraScore * 0.2;

  return Math.round(score * 100) / 10;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body: ProfileInput = await req.json();

    if (!body.tenth_score || !body.twelfth_score || !body.graduation_score || !body.graduation_stream || !body.target_exams?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileScore = calculateProfileScore(body);

    const prompt = `You are an expert MBA admissions counselor for Indian MBA programs. Analyze this student profile and provide extremely detailed, data-driven insights.

STUDENT PROFILE:
- Name: ${body.name || "Student"}
- 10th Score: ${body.tenth_score}%
- 12th Score: ${body.twelfth_score}%
- Graduation Score: ${body.graduation_score}% in ${body.graduation_stream} ${body.is_pursuing_graduation ? "(Currently Pursuing)" : ""}
- Work Experience: ${body.work_experience_months} months ${body.work_experience_months === 0 ? "(Fresher)" : ""}
- Category: ${body.category}
- Gender: ${body.gender || "Not specified"}
- Target Exams: ${body.target_exams?.join(", ")}
- Target Colleges: ${body.target_colleges?.join(", ") || "Not specified"}
- Preferred Specialization: ${body.preferred_specialization || "Not specified"}
- Target States for MBA: ${body.target_states?.join(", ") || "Pan India"}
- Calculated Profile Score: ${profileScore}/10

Provide a comprehensive, highly detailed analysis. Include specific percentile targets, cutoff scores, and difficulty ratings. For the detailed_college_table, include 15-25 colleges with precise data points. Be very specific and actionable.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert Indian MBA admissions counselor. Provide specific, data-driven insights with real college names, actual cutoffs, and precise percentile targets." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_profile_analysis",
              description: "Generate a comprehensive MBA profile analysis with detailed college comparison table",
              parameters: {
                type: "object",
                properties: {
                  strengths: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "description", "impact"],
                    },
                    description: "4-6 specific strengths",
                  },
                  weaknesses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["high", "medium", "low"] },
                        fix: { type: "string" },
                      },
                      required: ["title", "description", "severity", "fix"],
                    },
                    description: "4-6 specific weaknesses with actionable fixes",
                  },
                  college_predictions: {
                    type: "object",
                    properties: {
                      dream: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            probability: { type: "number" },
                            cutoff_info: { type: "string" },
                            tip: { type: "string" },
                          },
                          required: ["name", "probability", "cutoff_info"],
                        },
                      },
                      target: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            probability: { type: "number" },
                            cutoff_info: { type: "string" },
                            tip: { type: "string" },
                          },
                          required: ["name", "probability", "cutoff_info"],
                        },
                      },
                      safe: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            probability: { type: "number" },
                            cutoff_info: { type: "string" },
                            tip: { type: "string" },
                          },
                          required: ["name", "probability", "cutoff_info"],
                        },
                      },
                    },
                    required: ["dream", "target", "safe"],
                  },
                  detailed_college_table: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        college_name: { type: "string", description: "Full name of the college e.g. IIM Ahmedabad" },
                        city: { type: "string" },
                        state: { type: "string" },
                        nirf_ranking: { type: "number", description: "NIRF MBA ranking if available, 0 if not" },
                        avg_fees_lakhs: { type: "number", description: "Total MBA fees in lakhs" },
                        avg_package_lakhs: { type: "number", description: "Average placement package in LPA" },
                        median_package_lakhs: { type: "number", description: "Median placement package in LPA" },
                        highest_package_lakhs: { type: "number", description: "Highest placement package in LPA" },
                        required_cat_percentile: { type: "number", description: "Minimum CAT percentile required for this student's category" },
                        student_cat_target: { type: "number", description: "Recommended target CAT percentile for safe admission" },
                        acceptance_rate_percent: { type: "number", description: "Approximate acceptance rate" },
                        your_admission_probability: { type: "number", description: "This student's specific admission probability 0-100" },
                        difficulty: { type: "string", enum: ["Easy", "Medium", "Hard", "Very Hard"], description: "How difficult it is for THIS specific student to get in" },
                        key_selection_criteria: { type: "string", description: "Main selection factors e.g. CAT score + WAT-PI + Academics" },
                        recommendation: { type: "string", description: "Specific advice for this student for this college" },
                        tier: { type: "string", enum: ["Dream", "Target", "Safe"] },
                      },
                      required: ["college_name", "city", "state", "avg_fees_lakhs", "avg_package_lakhs", "required_cat_percentile", "student_cat_target", "your_admission_probability", "difficulty", "key_selection_criteria", "recommendation", "tier"],
                    },
                    description: "Detailed table of 15-25 MBA colleges with stats, percentile targets, difficulty ratings. Must include top IIMs, newer IIMs, non-IIM Tier 1, and Tier 2 colleges.",
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["critical", "high", "medium"] },
                        timeline: { type: "string" },
                      },
                      required: ["title", "description", "priority"],
                    },
                    description: "6-8 specific actionable recommendations",
                  },
                  study_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phase: { type: "string" },
                        duration: { type: "string" },
                        focus_areas: { type: "array", items: { type: "string" } },
                        target_score: { type: "string" },
                        daily_hours: { type: "number" },
                      },
                      required: ["phase", "duration", "focus_areas"],
                    },
                    description: "4-5 phase study plan",
                  },
                  score_breakdown: {
                    type: "object",
                    properties: {
                      academics_score: { type: "number", description: "Score out of 10 for academics" },
                      work_experience_score: { type: "number", description: "Score out of 10 for work experience" },
                      diversity_score: { type: "number", description: "Score out of 10 for profile diversity/uniqueness" },
                      overall_competitiveness: { type: "string", enum: ["Very Strong", "Strong", "Moderate", "Needs Improvement", "Weak"] },
                    },
                    required: ["academics_score", "work_experience_score", "diversity_score", "overall_competitiveness"],
                  },
                  ai_summary: {
                    type: "string",
                    description: "A 4-5 sentence personalized summary. Be specific, encouraging, and reference actual college names. Address the student by name if provided.",
                  },
                },
                required: ["strengths", "weaknesses", "college_predictions", "detailed_college_table", "recommendations", "study_plan", "score_breakdown", "ai_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_profile_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;

    if (toolCall?.function?.arguments) {
      analysis = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      throw new Error("AI did not return structured analysis");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profileData, error: profileError } = await supabase
      .from("profile_analyses")
      .insert({
        tenth_score: body.tenth_score,
        twelfth_score: body.twelfth_score,
        graduation_score: body.graduation_score,
        graduation_stream: body.graduation_stream,
        work_experience_months: body.work_experience_months,
        category: body.category,
        gender: body.gender,
        target_exam: body.target_exams?.[0] || "CAT",
        target_colleges: body.target_colleges || [],
        preferred_specialization: body.preferred_specialization,
        phone: body.phone,
        email: body.email,
        profile_score: profileScore,
        report_unlocked: !!(body.phone || body.email),
      })
      .select("id")
      .single();

    if (profileError) {
      console.error("DB insert error:", profileError);
      throw new Error("Failed to save profile");
    }

    const { error: resultError } = await supabase
      .from("analysis_results")
      .insert({
        profile_analysis_id: profileData.id,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        college_predictions: analysis.college_predictions,
        probability_scores: analysis.score_breakdown || {},
        recommendations: analysis.recommendations,
        study_plan: analysis.study_plan,
        ai_summary: analysis.ai_summary,
      });

    if (resultError) {
      console.error("Result insert error:", resultError);
    }

    return new Response(
      JSON.stringify({
        profile_id: profileData.id,
        profile_score: profileScore,
        ...analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Profile analyzer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
