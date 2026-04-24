import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { callAIGateway } from "../_shared/aiGateway.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

interface ROIInput {
  user_id?: string;
  force?: boolean;
  name: string;
  email: string;
  phone: string;
  graduation_stream: string;
  graduation_score?: number;
  current_salary_lakhs: number;
  work_experience_years: number;
  current_role?: string;
  current_industry?: string;
  target_exams: string[];
  exam_attempt_number?: number;
  expected_tier: string;
  preferred_specialization?: string;
  budget_lakhs: number;
  family_income_lakhs?: number;
  loan_plan?: string; // 'self', 'partial_loan', 'full_loan'
  preferred_location?: string;
  target_states?: string[];
  target_colleges?: string[];
  career_goal?: string; // 'salary_jump', 'career_switch', 'entrepreneurship', 'consulting', 'leadership'
  expected_salary_lakhs?: number;
  age?: number;
}

function parseSalary(s?: string | null): number {
  if (!s) return 0;
  const nums = s.match(/\d+(\.\d+)?/g);
  if (!nums || !nums.length) return 0;
  const vals = nums.map(Number);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

const TIER_RANK: Record<string, number> = { "Tier 1": 3, "Tier 2": 2, "Tier 3": 1 };

function bucketCollege(collegeTier: string, expectedTier: string): "Dream" | "Target" | "Safe" {
  const c = TIER_RANK[collegeTier] || 2;
  const e = TIER_RANK[expectedTier] || 2;
  if (c > e) return "Dream";
  if (c === e) return "Target";
  return "Safe";
}

// 10-year salary projection assuming compounding growth
function projectSalary(startSalary: number, years: number, annualGrowth: number): number[] {
  const arr: number[] = [];
  let s = startSalary;
  for (let y = 0; y < years; y++) {
    arr.push(Math.round(s * 10) / 10);
    s = s * (1 + annualGrowth);
  }
  return arr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body: ROIInput = await req.json();

    if (!body.name || !body.email || !body.phone || !body.graduation_stream || !body.target_exams?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ===== ONE-CHECK-PER-USER: return existing report if found =====
    // Admins bypass the limit — verified server-side via JWT + user_roles, never trust client claims.
    let isAdminCaller = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const sbAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: userData } = await sbAuth.auth.getUser(authHeader.replace("Bearer ", ""));
        if (userData?.user) {
          const { data: roleRow } = await sb
            .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
          isAdminCaller = !!roleRow;
        }
      } catch (e) {
        console.warn("[roi-calculator] Admin check failed:", e);
      }
    }

    if (!isAdminCaller) {
      let existingQ = sb.from("roi_analyses").select("*").order("created_at", { ascending: false }).limit(1);
      if (body.user_id) {
        existingQ = existingQ.eq("user_id", body.user_id);
      } else {
        existingQ = existingQ.eq("phone", body.phone);
      }
      const { data: existingRows } = await existingQ;
      const existing = existingRows?.[0];
      if (existing) {
        return new Response(JSON.stringify({
          existing: true,
          analysis_id: existing.id,
          created_at: existing.created_at,
          profile: {
            name: existing.name,
            graduation_stream: existing.graduation_stream,
            current_salary_lakhs: existing.current_salary_lakhs,
            work_experience_years: existing.work_experience_years,
            target_exams: existing.target_exams,
            expected_tier: existing.expected_tier,
            preferred_specialization: existing.preferred_specialization,
            budget_lakhs: existing.budget_lakhs,
            preferred_location: existing.preferred_location,
          },
          metrics: {
            total_investment_lakhs: existing.total_investment_lakhs,
            expected_salary_lakhs: existing.expected_salary_lakhs,
            current_salary_lakhs: existing.current_salary_lakhs,
            payback_years: existing.payback_years,
            roi_score: existing.roi_score,
            roi_category: existing.roi_category,
          },
          colleges: existing.college_recommendations || {},
          ai: existing.ai_insights || {},
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Pull college dataset
    let query = sb.from("colleges").select("name, slug, city, state, tier, fees_lakhs, placement_avg, placement_highest, placement_median, exams_accepted, specializations, ranking, top_recruiters").not("fees_lakhs", "is", null).not("placement_avg", "is", null);

    if (body.target_exams?.length) query = query.overlaps("exams_accepted", body.target_exams);
    if (body.target_states && body.target_states.length > 0 && !body.target_states.includes("Pan India")) {
      query = query.in("state", body.target_states);
    }

    const { data: collegesRaw } = await query.limit(200);
    let colleges = collegesRaw || [];

    if (body.preferred_specialization && colleges.length > 10) {
      const filtered = colleges.filter((c: any) => c.specializations?.includes(body.preferred_specialization));
      if (filtered.length >= 6) colleges = filtered;
    }

    const currentSalary = Number(body.current_salary_lakhs) || 0;
    const workExp = Number(body.work_experience_years) || 0;
    const familyIncome = Number(body.family_income_lakhs) || 0;
    const userExpectedSalary = Number(body.expected_salary_lakhs) || 0;

    // Compute per-college ROI with extended metrics
    const computed = colleges.map((c: any) => {
      const fees = Number(c.fees_lakhs) || 0;
      const expectedSalary = parseSalary(c.placement_avg);
      const highestSalary = parseSalary(c.placement_highest);
      const medianSalary = parseSalary(c.placement_median) || expectedSalary;
      const opportunityCost = currentSalary * 2;
      const livingCost = 4; // ₹4L for 2 years living
      const totalInvestment = fees + opportunityCost + livingCost;
      const annualGain = Math.max(expectedSalary - currentSalary, 0.5);
      const paybackYears = annualGain > 0 ? totalInvestment / annualGain : 99;
      const salaryMultiple = currentSalary > 0 ? expectedSalary / currentSalary : expectedSalary / 4;

      // 10-year lifetime earnings (with vs without MBA)
      const without = projectSalary(Math.max(currentSalary, 4), 10, 0.10).reduce((a, b) => a + b, 0);
      const withMba = projectSalary(expectedSalary, 10, 0.13).reduce((a, b) => a + b, 0) - totalInvestment;
      const tenYearGain = withMba - without;

      const paybackScore = Math.max(0, 100 - paybackYears * 15);
      const multipleScore = Math.min(100, salaryMultiple * 25);
      const tierScore = (TIER_RANK[c.tier || "Tier 2"] || 2) * 33;
      const roiScore = Math.round(paybackScore * 0.5 + multipleScore * 0.3 + tierScore * 0.2);

      return {
        name: c.name, slug: c.slug, city: c.city, state: c.state,
        tier: c.tier || "Tier 2",
        fees_lakhs: fees,
        expected_salary_lakhs: Math.round(expectedSalary * 10) / 10,
        highest_salary_lakhs: Math.round(highestSalary * 10) / 10,
        median_salary_lakhs: Math.round(medianSalary * 10) / 10,
        total_investment_lakhs: Math.round(totalInvestment * 10) / 10,
        payback_years: Math.round(paybackYears * 10) / 10,
        salary_multiple: Math.round(salaryMultiple * 10) / 10,
        ten_year_net_gain_lakhs: Math.round(tenYearGain * 10) / 10,
        roi_score: roiScore,
        bucket: bucketCollege(c.tier || "Tier 2", body.expected_tier),
        ranking: c.ranking,
        top_recruiters: c.top_recruiters?.slice(0, 5) || [],
      };
    }).sort((a, b) => b.roi_score - a.roi_score);

    const dream = computed.filter(c => c.bucket === "Dream").slice(0, 6);
    const target = computed.filter(c => c.bucket === "Target").slice(0, 8);
    const safe = computed.filter(c => c.bucket === "Safe").slice(0, 6);

    const headlineCollege = target[0] || computed[0];
    const headlineFees = headlineCollege?.fees_lakhs || body.budget_lakhs || 15;
    const headlineSalary = headlineCollege?.expected_salary_lakhs || userExpectedSalary || 18;
    const totalInvestment = headlineFees + currentSalary * 2 + 4;
    const paybackYears = headlineSalary > currentSalary
      ? totalInvestment / Math.max(headlineSalary - currentSalary, 0.5)
      : 99;

    // Year-by-year cashflow over 10 years
    const cashflow = [];
    let cumWith = -totalInvestment;
    let cumWithout = 0;
    let salWith = headlineSalary;
    let salWithout = Math.max(currentSalary, 4);
    for (let y = 1; y <= 10; y++) {
      cumWith += salWith;
      cumWithout += salWithout;
      cashflow.push({
        year: y,
        with_mba_salary: Math.round(salWith * 10) / 10,
        without_mba_salary: Math.round(salWithout * 10) / 10,
        cumulative_with_mba: Math.round(cumWith * 10) / 10,
        cumulative_without_mba: Math.round(cumWithout * 10) / 10,
        net_advantage: Math.round((cumWith - cumWithout) * 10) / 10,
      });
      salWith *= 1.13;
      salWithout *= 1.10;
    }

    const tenYearWithMba = cashflow[9].cumulative_with_mba;
    const tenYearWithoutMba = cashflow[9].cumulative_without_mba;
    const tenYearAdvantage = tenYearWithMba - tenYearWithoutMba;
    const breakEvenYear = cashflow.findIndex(c => c.net_advantage > 0) + 1 || 99;

    // Tier-wise comparison
    const tierBreakdown = ["Tier 1", "Tier 2", "Tier 3"].map(t => {
      const list = computed.filter(c => c.tier === t);
      const avgFees = list.length ? list.reduce((a, c) => a + c.fees_lakhs, 0) / list.length : 0;
      const avgSalary = list.length ? list.reduce((a, c) => a + c.expected_salary_lakhs, 0) / list.length : 0;
      const avgPayback = list.length ? list.reduce((a, c) => a + c.payback_years, 0) / list.length : 0;
      const avgRoi = list.length ? list.reduce((a, c) => a + c.roi_score, 0) / list.length : 0;
      return {
        tier: t,
        count: list.length,
        avg_fees_lakhs: Math.round(avgFees * 10) / 10,
        avg_salary_lakhs: Math.round(avgSalary * 10) / 10,
        avg_payback_years: Math.round(avgPayback * 10) / 10,
        avg_roi_score: Math.round(avgRoi),
      };
    });

    // Specialization-wise ROI (top recruiter sectors)
    const allRecruiters: Record<string, number> = {};
    computed.slice(0, 20).forEach(c => c.top_recruiters?.forEach((r: string) => {
      allRecruiters[r] = (allRecruiters[r] || 0) + 1;
    }));
    const topRecruiters = Object.entries(allRecruiters).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    const topRoiAvg = computed.slice(0, 10).reduce((a, c) => a + c.roi_score, 0) / Math.max(computed.slice(0, 10).length, 1);
    const roiCategory = topRoiAvg >= 70 ? "High" : topRoiAvg >= 45 ? "Medium" : "Low";

    // Loan EMI calculator (if loan plan)
    const loanAmount = body.loan_plan === "full_loan" ? headlineFees
      : body.loan_plan === "partial_loan" ? headlineFees * 0.6 : 0;
    const interestRate = 0.105; // 10.5% education loan
    const tenureYears = 7;
    const monthlyRate = interestRate / 12;
    const months = tenureYears * 12;
    const emi = loanAmount > 0
      ? (loanAmount * 100000 * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      : 0;
    const totalLoanRepayment = (emi * months) / 100000; // back to lakhs
    const loanInterest = totalLoanRepayment - loanAmount;

    // ===== AI narrative layer =====
    const studentName = body.name.split(" ")[0];
    const aiPrompt = `You are an MBA ROI advisor writing a long, premium personalized report for ${studentName}.

USER PROFILE:
- Name: ${body.name}, Age: ${body.age || "N/A"}
- Graduation: ${body.graduation_stream}${body.graduation_score ? ` (${body.graduation_score}%)` : ""}
- Current Role: ${body.current_role || "N/A"} in ${body.current_industry || "N/A"}
- Current Salary: ₹${currentSalary} LPA, Experience: ${workExp} years
- Family Income: ₹${familyIncome || "N/A"} LPA
- Target Exams: ${body.target_exams.join(", ")} (Attempt #${body.exam_attempt_number || 1})
- Expected College Tier: ${body.expected_tier}
- Specialization: ${body.preferred_specialization || "Open"}
- Career Goal: ${body.career_goal || "Salary jump"}
- MBA Budget: ₹${body.budget_lakhs} L
- Loan Plan: ${body.loan_plan || "Self-funded"}
- Preferred Location: ${body.preferred_location || "India"}
- Target Colleges: ${body.target_colleges?.join(", ") || "Open"}
- Salary Expectation: ₹${userExpectedSalary || "N/A"} LPA

COMPUTED METRICS:
- Total Investment: ₹${totalInvestment.toFixed(1)} L (fees + opportunity cost + living)
- Expected Salary: ₹${headlineSalary.toFixed(1)} LPA
- Payback Period: ${paybackYears.toFixed(1)} years
- Break-even Year (vs no-MBA): Year ${breakEvenYear}
- 10-Year Net Advantage Over No-MBA: ₹${tenYearAdvantage.toFixed(1)} L
- Top Avg ROI Score: ${topRoiAvg.toFixed(0)}/100 (${roiCategory})
${loanAmount > 0 ? `- Loan EMI: ₹${(emi/1000).toFixed(1)}K/month × ${tenureYears}yr; Total interest: ₹${loanInterest.toFixed(1)}L` : ""}

TIER COMPARISON:
${tierBreakdown.map(t => `${t.tier}: ${t.count} colleges, avg fees ₹${t.avg_fees_lakhs}L, avg salary ₹${t.avg_salary_lakhs}LPA, payback ${t.avg_payback_years}y`).join("\n")}

TOP COLLEGES BY BUCKET:
DREAM: ${dream.slice(0, 4).map(c => `${c.name} (Payback ${c.payback_years}y, ROI ${c.roi_score})`).join("; ")}
TARGET: ${target.slice(0, 4).map(c => `${c.name} (Payback ${c.payback_years}y, ROI ${c.roi_score})`).join("; ")}
SAFE: ${safe.slice(0, 4).map(c => `${c.name} (Payback ${c.payback_years}y, ROI ${c.roi_score})`).join("; ")}

Write a deeply personalized, long-form, advisor-style report. Address ${studentName} by first name throughout. Reference specific numbers. Be honest about risks. Provide clear, actionable guidance.`;

    const aiResp = await callAIGateway({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are 'B School Buzz ROI Advisor' — a warm, data-driven MBA financial counselor. Always address the student by first name. Use specific numbers from their profile. Write in a long, detailed, premium-advisor tone. Never use generic phrasing." },
          { role: "user", content: aiPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_roi_report",
            description: "Generate a premium long-form personalized MBA ROI report",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["Strong Yes", "Yes — With Caveats", "Wait & Strengthen Profile", "Reconsider"] },
                verdict_summary: { type: "string", description: "3-4 sentence direct answer addressing student by first name" },
                executive_summary: { type: "string", description: "250-350 word personalized executive summary referencing actual numbers" },
                profile_strengths: { type: "array", items: { type: "string" }, description: "4-5 specific profile strengths" },
                profile_weaknesses: { type: "array", items: { type: "string" }, description: "3-4 specific profile weaknesses" },
                why_mba_makes_sense: { type: "array", items: { type: "string" }, description: "4-5 reasons MBA fits this profile" },
                why_mba_might_not: { type: "array", items: { type: "string" }, description: "3-4 honest red flags" },
                financial_analysis: { type: "string", description: "200-300 word deep financial breakdown — fees, EMI if loan, living costs, opportunity cost, break-even" },
                career_trajectory: { type: "string", description: "200-250 word career path projection over 10 years post-MBA" },
                salary_growth_narrative: { type: "string", description: "150-200 words explaining the salary jump expectation" },
                dream_narrative: { type: "string", description: "2-3 sentence narrative for dream colleges with reach assessment" },
                target_narrative: { type: "string", description: "2-3 sentence narrative for target colleges" },
                safe_narrative: { type: "string", description: "2-3 sentence narrative for safe colleges" },
                specialization_advice: { type: "string", description: "150-200 words on chosen specialization fit and alternatives" },
                exam_strategy: { type: "string", description: "150-200 word exam preparation strategy based on target exams and attempt number" },
                scholarship_opportunities: { type: "array", items: { type: "string" }, description: "4-5 scholarship/funding options to explore" },
                loan_advice: { type: "string", description: "150-200 word loan strategy advice based on their loan plan and family income" },
                risk_level: { type: "string", enum: ["Low", "Moderate", "High", "Very High"] },
                risk_analysis: { type: "string", description: "200-250 word risk paragraph" },
                risk_factors: { type: "array", items: { type: "object", properties: { factor: { type: "string" }, severity: { type: "string", enum: ["Low", "Medium", "High"] }, mitigation: { type: "string" } }, required: ["factor", "severity", "mitigation"] }, description: "4-6 risk factors with severity and mitigation" },
                backup_suggestions: { type: "array", items: { type: "string" }, description: "4-5 backup strategies if MBA plan fails" },
                alternative_paths: { type: "array", items: { type: "object", properties: { path: { type: "string" }, description: { type: "string" }, suitability: { type: "string", enum: ["High", "Medium", "Low"] } }, required: ["path", "description", "suitability"] }, description: "3-4 alternative career paths to MBA" },
                recommendations: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["critical", "high", "medium"] }, timeline: { type: "string" } }, required: ["title", "description", "priority", "timeline"] }, description: "6-8 actionable recommendations with timelines" },
                six_month_roadmap: { type: "array", items: { type: "object", properties: { month: { type: "string" }, focus: { type: "string" }, actions: { type: "array", items: { type: "string" } } }, required: ["month", "focus", "actions"] }, description: "6-month month-by-month roadmap" },
                final_verdict: { type: "string", description: "Decisive 5-6 line final verdict" },
                next_steps: { type: "array", items: { type: "string" }, description: "5-6 immediate next steps" },
                faq: { type: "array", items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] }, description: "4-5 personalized FAQs answered" },
                profile_score_breakdown: { type: "object", properties: { academic: { type: "number" }, work_experience: { type: "number" }, exam_readiness: { type: "number" }, financial_readiness: { type: "number" }, career_clarity: { type: "number" }, overall: { type: "number" } }, required: ["academic", "work_experience", "exam_readiness", "financial_readiness", "career_clarity", "overall"], description: "5-dimension profile scores out of 100" },
                tier_recommendation: { type: "string", description: "150-200 word advisor's tier recommendation with reasoning" },
                opportunity_cost_explained: { type: "string", description: "150-200 word breakdown of what student gives up by doing MBA" },
                lifetime_earnings_narrative: { type: "string", description: "200-250 word lifetime earnings comparison narrative across With-MBA vs Without-MBA paths over 20 years" },
                placement_outlook: { type: "string", description: "150-200 word outlook on placement trends for the chosen specialization" },
                industry_pivot_paths: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, difficulty: { type: "string", enum: ["Easy", "Moderate", "Hard"] }, success_rate: { type: "string" } }, required: ["from", "to", "difficulty", "success_rate"] }, description: "3-5 industry pivot opportunities post-MBA" },
                competitive_advantage: { type: "array", items: { type: "string" }, description: "4-5 specific competitive edges this student has over peers" },
                preparation_gaps: { type: "array", items: { type: "object", properties: { area: { type: "string" }, current_level: { type: "string" }, target_level: { type: "string" }, action: { type: "string" } }, required: ["area", "current_level", "target_level", "action"] }, description: "4-5 specific gaps to close before exam day" },
                interview_prep_focus: { type: "array", items: { type: "string" }, description: "5-6 personalized GD-PI prep focus areas" },
                key_metrics_explained: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, value: { type: "string" }, what_it_means: { type: "string" } }, required: ["metric", "value", "what_it_means"] }, description: "5-6 key metrics explained in plain English" },
                comparable_alumni_stories: { type: "array", items: { type: "object", properties: { name: { type: "string" }, background: { type: "string" }, college: { type: "string" }, outcome: { type: "string" } }, required: ["name", "background", "college", "outcome"] }, description: "3 realistic alumni success stories with similar profile" },
              },
              required: ["verdict", "verdict_summary", "executive_summary", "profile_strengths", "profile_weaknesses", "why_mba_makes_sense", "why_mba_might_not", "financial_analysis", "career_trajectory", "salary_growth_narrative", "dream_narrative", "target_narrative", "safe_narrative", "specialization_advice", "exam_strategy", "scholarship_opportunities", "loan_advice", "risk_level", "risk_analysis", "risk_factors", "backup_suggestions", "alternative_paths", "recommendations", "six_month_roadmap", "final_verdict", "next_steps", "faq", "profile_score_breakdown", "tier_recommendation", "opportunity_cost_explained", "lifetime_earnings_narrative", "placement_outlook", "industry_pivot_paths", "competitive_advantage", "preparation_gaps", "interview_prep_focus", "key_metrics_explained", "comparable_alumni_stories"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_roi_report" } },
      });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit hit. Please try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    await logAIUsage("roi-calculator", "google/gemini-2.5-flash", aiData);

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const aiInsights = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    // Save to DB
    const collegeRecsBundle = {
      dream, target, safe,
      all_top: computed.slice(0, 25),
      tier_breakdown: tierBreakdown,
      top_recruiters: topRecruiters,
      cashflow,
      financial: {
        loan_amount_lakhs: Math.round(loanAmount * 10) / 10,
        loan_emi_monthly: Math.round(emi),
        loan_total_repayment_lakhs: Math.round(totalLoanRepayment * 10) / 10,
        loan_interest_lakhs: Math.round(loanInterest * 10) / 10,
        ten_year_with_mba_lakhs: Math.round(tenYearWithMba * 10) / 10,
        ten_year_without_mba_lakhs: Math.round(tenYearWithoutMba * 10) / 10,
        ten_year_advantage_lakhs: Math.round(tenYearAdvantage * 10) / 10,
        break_even_year: breakEvenYear,
      },
    };

    const { data: saved, error: saveErr } = await sb.from("roi_analyses").insert({
      user_id: body.user_id || null,
      name: body.name, email: body.email, phone: body.phone,
      graduation_stream: body.graduation_stream,
      current_salary_lakhs: currentSalary,
      work_experience_years: workExp,
      target_exams: body.target_exams,
      expected_tier: body.expected_tier,
      preferred_specialization: body.preferred_specialization,
      budget_lakhs: body.budget_lakhs,
      preferred_location: body.preferred_location,
      target_states: body.target_states || [],
      total_investment_lakhs: Math.round(totalInvestment * 10) / 10,
      expected_salary_lakhs: Math.round(headlineSalary * 10) / 10,
      payback_years: Math.round(paybackYears * 10) / 10,
      roi_score: Math.round(topRoiAvg),
      roi_category: roiCategory,
      ai_insights: aiInsights,
      college_recommendations: collegeRecsBundle,
      report_unlocked: false,
    }).select().single();

    if (saveErr) console.error("DB save error:", saveErr);

    return new Response(JSON.stringify({
      existing: false,
      analysis_id: saved?.id,
      profile: {
        name: body.name, graduation_stream: body.graduation_stream,
        current_salary_lakhs: currentSalary, work_experience_years: workExp,
        target_exams: body.target_exams, expected_tier: body.expected_tier,
        preferred_specialization: body.preferred_specialization,
        budget_lakhs: body.budget_lakhs, preferred_location: body.preferred_location,
        family_income_lakhs: familyIncome, loan_plan: body.loan_plan,
        career_goal: body.career_goal, age: body.age,
        current_role: body.current_role, current_industry: body.current_industry,
      },
      metrics: {
        total_investment_lakhs: Math.round(totalInvestment * 10) / 10,
        expected_salary_lakhs: Math.round(headlineSalary * 10) / 10,
        current_salary_lakhs: currentSalary,
        payback_years: Math.round(paybackYears * 10) / 10,
        roi_score: Math.round(topRoiAvg),
        roi_category: roiCategory,
        break_even_year: breakEvenYear,
        ten_year_advantage_lakhs: Math.round(tenYearAdvantage * 10) / 10,
      },
      colleges: collegeRecsBundle,
      ai: aiInsights,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("roi-calculator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
