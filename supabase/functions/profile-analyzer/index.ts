import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=denonext";

import { callAIGateway } from "../_shared/aiGateway.ts";
async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    const { error } = await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
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
  // New fields
  fee_budget_lakhs?: number;
  expected_salary_lakhs?: number;
  current_employer_type?: string;
  graduation_year?: number;
  has_certifications?: string[];
  extracurriculars?: string[];
  leadership_roles?: string;
  preparation_months_remaining?: number;
  current_city?: string;
  has_gap_years?: boolean;
  gap_year_reason?: string;
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

  // Bonus for certifications & leadership
  let bonusScore = 0;
  if (p.has_certifications && p.has_certifications.length > 0) bonusScore += 0.05 * Math.min(p.has_certifications.length, 3);
  if (p.leadership_roles && p.leadership_roles !== "none") bonusScore += 0.05;
  if (p.extracurriculars && p.extracurriculars.length > 0) bonusScore += 0.03 * Math.min(p.extracurriculars.length, 3);

  const score =
    tenthNorm * 0.12 + twelfthNorm * 0.12 + gradNorm * 0.18 +
    workScore * 0.2 + catScore * 0.08 + extraScore * 0.15 + Math.min(bonusScore, 0.15);

  return Math.round(score * 100) / 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const body: ProfileInput & { user_id?: string } = await req.json();

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
- Graduation Year: ${body.graduation_year || "Not specified"}
- Work Experience: ${workExpLabel}
- Current Employer Type: ${body.current_employer_type || "Not specified"}
- Category: ${body.category}
- Gender: ${body.gender || "Not specified"}
- Current City: ${body.current_city || "Not specified"}
- Target Exams: ${body.target_exams?.join(", ")}
- Target Colleges: ${body.target_colleges?.join(", ") || "Not specified"}
- Preferred Specialization: ${body.preferred_specialization || "Not specified"}
- Target States for MBA: ${body.target_states?.join(", ") || "Pan India"}
- Fee Budget: ${body.fee_budget_lakhs ? `₹${body.fee_budget_lakhs} Lakhs` : "No budget constraint"}
- Expected Post-MBA Salary: ${body.expected_salary_lakhs ? `₹${body.expected_salary_lakhs} LPA` : "Not specified"}
- Certifications: ${body.has_certifications?.join(", ") || "None"}
- Extracurriculars: ${body.extracurriculars?.join(", ") || "None"}
- Leadership Experience: ${body.leadership_roles || "None specified"}
- Months Until Exam: ${body.preparation_months_remaining || "Not specified"}
- Gap Years: ${body.has_gap_years ? `Yes - ${body.gap_year_reason || "reason not specified"}` : "No"}
- Calculated Profile Score: ${profileScore}/10

PERSONALIZATION RULES:
1. Address ${studentName.split(" ")[0]} by name in ai_summary, strengths, weaknesses, and recommendations
2. Reference their SPECIFIC scores, stream, and target colleges in every insight
3. Compare their profile against ACTUAL cutoffs of their target colleges
4. If they're a fresher, emphasize how to compensate through academics and extracurriculars
5. If they have work experience, highlight how it benefits specific college applications
6. Mention their ${body.graduation_stream} background specifically when discussing profile fit
7. For strengths/weaknesses, tie each one back to their specific numbers
8. For college predictions, use their actual target colleges and provide realistic probabilities
9. Make study plan timeline specific to months remaining before their target exams
10. If fee budget is specified, filter and prioritize colleges within that budget
11. If expected salary is specified, calculate ROI for each college
12. Factor in certifications, extracurriculars, and leadership in profile evaluation

Provide a comprehensive, highly detailed analysis. Include specific percentile targets, cutoff scores, and difficulty ratings. For the detailed_college_table, include 15-25 colleges with precise data points.

IMPORTANT: For peer_comparison, simulate realistic data showing where this student stands among MBA aspirants. Generate a bell curve distribution with 10 score ranges (1-2, 2-3, ... 9-10) with realistic student counts summing to the total. Mark the bucket that contains this student's score.

For roi_analysis, calculate for each recommended college: total investment (fees + living costs), expected salary post-MBA, payback period, 5-year ROI percentage, and 10-year cumulative earnings advantage.

For salary_benchmarking, provide current salary estimates for their profile (pre-MBA) vs post-MBA salary ranges for each tier of colleges. Include sector-wise salary data.

For improvement_roadmap, provide a month-by-month timeline with specific milestones, mock test targets, and measurable goals.`;

    const aiResponse = await callAIGateway({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an expert Indian MBA admissions counselor named "B School Buzz AI Counselor". You speak directly to the student by their first name. Every insight must reference their specific data points — never give generic advice. Be warm, encouraging, yet brutally honest about areas needing improvement. Use their actual scores, stream, work experience, and target colleges to make every sentence feel personally crafted for them. Provide extremely quantitative, data-rich analysis with specific numbers, percentages, and benchmarks.` },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_profile_analysis",
              description: "Generate a comprehensive MBA profile analysis with detailed college comparison table, peer comparison, exam strategy, ROI analysis, salary benchmarking, and 5-dimension scoring",
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
                        quantitative_impact: { type: "string", description: "Specific quantitative impact e.g. 'Increases admission probability by 15% at IIM-L'" },
                      },
                      required: ["title", "description", "impact", "quantitative_impact"],
                    },
                    description: "5-7 specific strengths with quantitative impacts",
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
                        improvement_potential: { type: "string", description: "How much score improvement is possible if fixed e.g. '+0.8 to profile score'" },
                        timeline_to_fix: { type: "string", description: "How long it takes to fix e.g. '2-3 months'" },
                      },
                      required: ["title", "description", "severity", "fix", "improvement_potential", "timeline_to_fix"],
                    },
                    description: "5-7 specific weaknesses with actionable fixes and timelines",
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
                        expected_outcome: { type: "string", description: "What will improve if this recommendation is followed" },
                      },
                      required: ["title", "description", "priority", "expected_outcome"],
                    },
                    description: "8-10 specific actionable recommendations",
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
                        mock_test_target: { type: "string", description: "Target score in mock tests for this phase" },
                        key_milestones: { type: "array", items: { type: "string" }, description: "2-3 specific milestones to hit" },
                      },
                      required: ["phase", "duration", "focus_areas", "key_milestones"],
                    },
                    description: "5-6 phase study plan with specific milestones",
                  },
                  score_breakdown: {
                    type: "object",
                    properties: {
                      academics_score: { type: "number" },
                      work_experience_score: { type: "number" },
                      diversity_score: { type: "number" },
                      profile_consistency_score: { type: "number" },
                      leadership_potential_score: { type: "number" },
                      extracurricular_score: { type: "number", description: "Score out of 10 for extracurriculars and certifications" },
                      overall_competitiveness: { type: "string", enum: ["Very Strong", "Strong", "Moderate", "Needs Improvement", "Weak"] },
                      percentile_among_aspirants: { type: "number" },
                    },
                    required: ["academics_score", "work_experience_score", "diversity_score", "profile_consistency_score", "leadership_potential_score", "extracurricular_score", "overall_competitiveness", "percentile_among_aspirants"],
                  },
                  exam_strategy: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exam_name: { type: "string" },
                        recommended_score: { type: "string" },
                        preparation_months: { type: "number" },
                        difficulty_for_student: { type: "string", enum: ["Easy", "Medium", "Hard", "Very Hard"] },
                        roi_rating: { type: "string", enum: ["Very High", "High", "Medium", "Low"] },
                        section_wise_strategy: { type: "array", items: { type: "object", properties: { section: { type: "string" }, target_score: { type: "string" }, current_estimate: { type: "string" }, improvement_tips: { type: "string" } }, required: ["section", "target_score", "improvement_tips"] }, description: "Section-wise breakdown for this exam" },
                      },
                      required: ["exam_name", "recommended_score", "preparation_months", "difficulty_for_student", "roi_rating"],
                    },
                  },
                  peer_comparison: {
                    type: "object",
                    properties: {
                      total_students_analysed: { type: "number" },
                      average_score: { type: "number" },
                      your_rank_percentile: { type: "number" },
                      score_distribution: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            range: { type: "string" },
                            count: { type: "number" },
                            is_yours: { type: "boolean" },
                          },
                          required: ["range", "count", "is_yours"],
                        },
                      },
                    },
                    required: ["total_students_analysed", "average_score", "your_rank_percentile", "score_distribution"],
                  },
                  roi_analysis: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        college_name: { type: "string" },
                        total_investment_lakhs: { type: "number", description: "Total fees + living costs for full programme" },
                        expected_starting_salary_lakhs: { type: "number" },
                        payback_period_months: { type: "number", description: "Months to recover investment" },
                        five_year_roi_percent: { type: "number", description: "5-year ROI as percentage" },
                        ten_year_earnings_advantage_lakhs: { type: "number", description: "Extra earnings over 10 years vs no MBA" },
                        roi_rating: { type: "string", enum: ["Excellent", "Very Good", "Good", "Average", "Below Average"] },
                      },
                      required: ["college_name", "total_investment_lakhs", "expected_starting_salary_lakhs", "payback_period_months", "five_year_roi_percent", "roi_rating"],
                    },
                    description: "ROI analysis for top 8-12 colleges",
                  },
                  salary_benchmarking: {
                    type: "object",
                    properties: {
                      current_estimated_salary_lakhs: { type: "number", description: "Estimated current salary without MBA" },
                      post_mba_salary_range: {
                        type: "object",
                        properties: {
                          tier1_min: { type: "number" }, tier1_max: { type: "number" },
                          tier2_min: { type: "number" }, tier2_max: { type: "number" },
                          tier3_min: { type: "number" }, tier3_max: { type: "number" },
                        },
                        required: ["tier1_min", "tier1_max", "tier2_min", "tier2_max", "tier3_min", "tier3_max"],
                      },
                      sector_wise_salary: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            sector: { type: "string" },
                            avg_salary_lakhs: { type: "number" },
                            top_salary_lakhs: { type: "number" },
                            growth_rate_percent: { type: "number", description: "Annual salary growth rate" },
                          },
                          required: ["sector", "avg_salary_lakhs", "top_salary_lakhs", "growth_rate_percent"],
                        },
                        description: "Salary data for 6-8 key sectors",
                      },
                      salary_growth_trajectory: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            year: { type: "number", description: "Years after MBA (0, 1, 2, 3, 5, 7, 10)" },
                            with_mba_lakhs: { type: "number" },
                            without_mba_lakhs: { type: "number" },
                          },
                          required: ["year", "with_mba_lakhs", "without_mba_lakhs"],
                        },
                        description: "Salary trajectory comparison with and without MBA over 10 years",
                      },
                    },
                    required: ["current_estimated_salary_lakhs", "post_mba_salary_range", "sector_wise_salary", "salary_growth_trajectory"],
                  },
                  improvement_roadmap: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        month: { type: "number", description: "Month number (1, 2, 3, etc.)" },
                        milestone: { type: "string" },
                        target_percentile: { type: "string" },
                        focus_areas: { type: "array", items: { type: "string" } },
                        mock_score_target: { type: "string" },
                        profile_score_target: { type: "number", description: "Expected profile score by this month" },
                      },
                      required: ["month", "milestone", "focus_areas", "profile_score_target"],
                    },
                    description: "Month-by-month improvement roadmap for 6-12 months",
                  },
                  ai_summary: {
                    type: "string",
                    description: "A 6-8 sentence deeply personalized summary. Address the student by their first name. Reference their exact scores, stream, work experience, budget, salary expectations, and target colleges. Give specific advice. Be encouraging but honest. Include a key quantitative insight.",
                  },
                },
                required: ["strengths", "weaknesses", "college_predictions", "detailed_college_table", "recommendations", "study_plan", "score_breakdown", "exam_strategy", "peer_comparison", "roi_analysis", "salary_benchmarking", "improvement_roadmap", "ai_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_profile_analysis" } },
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
        user_id: body.user_id || null,
        name: body.name,
        tenth_score: body.tenth_score,
        twelfth_score: body.twelfth_score,
        graduation_score: body.graduation_score,
        graduation_stream: body.graduation_stream,
        is_pursuing_graduation: body.is_pursuing_graduation || false,
        work_experience_months: body.work_experience_months,
        category: body.category,
        gender: body.gender,
        target_exam: body.target_exams?.[0] || "CAT",
        target_exams: body.target_exams || [],
        target_colleges: body.target_colleges || [],
        target_states: body.target_states || [],
        preferred_specialization: body.preferred_specialization,
        phone: body.phone,
        email: body.email,
        profile_score: profileScore,
        report_unlocked: !!(body.phone || body.email),
        fee_budget_lakhs: body.fee_budget_lakhs,
        expected_salary_lakhs: body.expected_salary_lakhs,
        current_employer_type: body.current_employer_type || [],
        graduation_year: body.graduation_year,
        has_certifications: body.has_certifications || [],
        extracurriculars: body.extracurriculars || [],
        leadership_roles: body.leadership_roles,
        preparation_months_remaining: body.preparation_months_remaining,
        current_city: body.current_city,
        has_gap_years: body.has_gap_years || false,
        gap_year_reason: body.gap_year_reason,
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
          roi_analysis: analysis.roi_analysis,
          salary_benchmarking: analysis.salary_benchmarking,
          improvement_roadmap: analysis.improvement_roadmap,
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
