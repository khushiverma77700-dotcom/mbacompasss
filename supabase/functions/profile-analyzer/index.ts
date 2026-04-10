import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
  } catch (e) { console.error("Usage log error:", e); }
}

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

    const studentName = body.name || "Student";
    const workExpLabel = body.work_experience_months === 0 ? "Fresher" : `${body.work_experience_months} months`;
    
    const prompt = `You are an expert MBA admissions counselor for Indian MBA programs. Analyze this student profile and provide extremely detailed, personalized, data-driven insights. Address the student by their first name "${studentName.split(" ")[0]}" throughout your analysis. Make every insight feel like it was written specifically for them.

STUDENT PROFILE:
- Full Name: ${studentName}
- 10th Score: ${body.tenth_score}%
- 12th Score: ${body.twelfth_score}%
- Graduation Score: ${body.graduation_score}% in ${body.graduation_stream} ${body.is_pursuing_graduation ? "(Currently Pursuing)" : ""}
- Work Experience: ${workExpLabel}
- Category: ${body.category}
- Gender: ${body.gender || "Not specified"}
- Target Exams: ${body.target_exams?.join(", ")}
- Target Colleges: ${body.target_colleges?.join(", ") || "Not specified"}
- Preferred Specialization: ${body.preferred_specialization || "Not specified"}
- Target States for MBA: ${body.target_states?.join(", ") || "Pan India"}
- Calculated Profile Score: ${profileScore}/10

PERSONALIZATION RULES:
1. Address ${studentName.split(" ")[0]} by name in ai_summary, strengths, weaknesses, and recommendations
2. Reference their SPECIFIC scores, stream, and target colleges in every insight
3. Compare their profile against ACTUAL cutoffs of their target colleges
4. If they're a fresher, emphasize how to compensate through academics and extracurriculars
5. If they have work experience, highlight how it benefits specific college applications
6. Mention their ${body.graduation_stream} background specifically when discussing profile fit
7. For strengths/weaknesses, tie each one back to their specific numbers (e.g., "Your ${body.tenth_score}% in 10th...")
8. For college predictions, use their actual target colleges and provide realistic probabilities
9. Make study plan timeline specific to months remaining before their target exams

Provide a comprehensive, highly detailed analysis. Include specific percentile targets, cutoff scores, and difficulty ratings. For the detailed_college_table, include 15-25 colleges with precise data points. Be very specific and actionable.

IMPORTANT: For peer_comparison, simulate realistic data showing where this student stands among MBA aspirants. Generate a bell curve distribution with 10 score ranges (1-2, 2-3, ... 9-10) with realistic student counts summing to the total. Mark the bucket that contains this student's score.

For exam_strategy, provide specific recommendations for each target exam the student selected.

For score_breakdown, provide 5 dimension scores: academics, work_experience, diversity, profile_consistency (how consistent are their scores across 10th/12th/grad), and leadership_potential. Also provide percentile_among_aspirants (0-100).`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an expert Indian MBA admissions counselor named "B School Buzz AI Counselor". You speak directly to the student by their first name. Every insight must reference their specific data points — never give generic advice. Be warm, encouraging, yet brutally honest about areas needing improvement. Use their actual scores, stream, work experience, and target colleges to make every sentence feel personally crafted for them.` },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_profile_analysis",
              description: "Generate a comprehensive MBA profile analysis with detailed college comparison table, peer comparison, exam strategy, and 5-dimension scoring",
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
                        college_name: { type: "string" },
                        city: { type: "string" },
                        state: { type: "string" },
                        nirf_ranking: { type: "number" },
                        avg_fees_lakhs: { type: "number" },
                        avg_package_lakhs: { type: "number" },
                        median_package_lakhs: { type: "number" },
                        highest_package_lakhs: { type: "number" },
                        required_cat_percentile: { type: "number" },
                        student_cat_target: { type: "number" },
                        acceptance_rate_percent: { type: "number" },
                        your_admission_probability: { type: "number" },
                        difficulty: { type: "string", enum: ["Easy", "Medium", "Hard", "Very Hard"] },
                        key_selection_criteria: { type: "string" },
                        recommendation: { type: "string" },
                        tier: { type: "string", enum: ["Dream", "Target", "Safe"] },
                      },
                      required: ["college_name", "city", "state", "avg_fees_lakhs", "avg_package_lakhs", "required_cat_percentile", "student_cat_target", "your_admission_probability", "difficulty", "key_selection_criteria", "recommendation", "tier"],
                    },
                    description: "Detailed table of 15-25 MBA colleges.",
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
                      profile_consistency_score: { type: "number", description: "Score out of 10 for consistency across 10th/12th/graduation scores" },
                      leadership_potential_score: { type: "number", description: "Score out of 10 for leadership potential based on experience and profile" },
                      overall_competitiveness: { type: "string", enum: ["Very Strong", "Strong", "Moderate", "Needs Improvement", "Weak"] },
                      percentile_among_aspirants: { type: "number", description: "Percentile rank among all MBA aspirants 0-100" },
                    },
                    required: ["academics_score", "work_experience_score", "diversity_score", "profile_consistency_score", "leadership_potential_score", "overall_competitiveness", "percentile_among_aspirants"],
                  },
                  exam_strategy: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exam_name: { type: "string" },
                        recommended_score: { type: "string", description: "Target score or percentile for this exam" },
                        preparation_months: { type: "number" },
                        difficulty_for_student: { type: "string", enum: ["Easy", "Medium", "Hard", "Very Hard"] },
                        roi_rating: { type: "string", enum: ["Very High", "High", "Medium", "Low"] },
                      },
                      required: ["exam_name", "recommended_score", "preparation_months", "difficulty_for_student", "roi_rating"],
                    },
                    description: "Strategy for each target exam the student selected",
                  },
                  peer_comparison: {
                    type: "object",
                    properties: {
                      total_students_analysed: { type: "number", description: "Total students in the comparison pool, use 25000+" },
                      average_score: { type: "number", description: "Average profile score of all students" },
                      your_rank_percentile: { type: "number", description: "This student's percentile rank 0-100" },
                      score_distribution: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            range: { type: "string", description: "Score range e.g. '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'" },
                            count: { type: "number", description: "Number of students in this range" },
                            is_yours: { type: "boolean", description: "True if this student's score falls in this range" },
                          },
                          required: ["range", "count", "is_yours"],
                        },
                        description: "Bell curve distribution with 9 buckets. Counts should form a realistic bell curve shape.",
                      },
                    },
                    required: ["total_students_analysed", "average_score", "your_rank_percentile", "score_distribution"],
                  },
                  ai_summary: {
                    type: "string",
                    description: "A 5-6 sentence deeply personalized summary. Address the student by their first name. Reference their exact scores, stream, work experience, and target colleges. Give specific advice like 'With your 85% in Engineering and 24 months at TCS, you have a strong shot at IIM Lucknow'. Be encouraging but honest.",
                  },
                },
                required: ["strengths", "weaknesses", "college_predictions", "detailed_college_table", "recommendations", "study_plan", "score_breakdown", "exam_strategy", "peer_comparison", "ai_summary"],
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
    await logAIUsage("profile-analyzer", "google/gemini-2.5-flash", aiData);
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
        probability_scores: {
          ...analysis.score_breakdown,
          exam_strategy: analysis.exam_strategy,
          peer_comparison: analysis.peer_comparison,
        },
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
