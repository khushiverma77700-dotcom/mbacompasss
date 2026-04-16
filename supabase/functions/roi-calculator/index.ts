import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  name: string;
  email: string;
  phone: string;
  graduation_stream: string;
  current_salary_lakhs: number;
  work_experience_years: number;
  target_exams: string[];
  expected_tier: string;
  preferred_specialization?: string;
  budget_lakhs: number;
  preferred_location?: string;
  target_states?: string[];
}

// Parse "₹15-20 LPA" or "18 LPA" → number in lakhs
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

serve(async (req) => {
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

    // Pull college dataset filtered by exam, specialization, state
    let query = sb.from("colleges").select("name, slug, city, state, tier, fees_lakhs, placement_avg, placement_highest, placement_median, exams_accepted, specializations, ranking, top_recruiters").not("fees_lakhs", "is", null).not("placement_avg", "is", null);

    if (body.target_exams?.length) {
      query = query.overlaps("exams_accepted", body.target_exams);
    }
    if (body.target_states && body.target_states.length > 0 && !body.target_states.includes("Pan India")) {
      query = query.in("state", body.target_states);
    }

    const { data: collegesRaw } = await query.limit(200);
    let colleges = collegesRaw || [];

    // Specialization filter (soft — only if many results remain)
    if (body.preferred_specialization && colleges.length > 10) {
      const filtered = colleges.filter((c: any) => c.specializations?.includes(body.preferred_specialization));
      if (filtered.length >= 6) colleges = filtered;
    }

    const currentSalary = Number(body.current_salary_lakhs) || 0;
    const workExp = Number(body.work_experience_years) || 0;

    // Compute per-college ROI
    const computed = colleges.map((c: any) => {
      const fees = Number(c.fees_lakhs) || 0;
      const expectedSalary = parseSalary(c.placement_avg);
      const opportunityCost = currentSalary * 2; // 2-yr MBA
      const totalInvestment = fees + opportunityCost;
      const annualGain = Math.max(expectedSalary - currentSalary, 0.5);
      const paybackYears = annualGain > 0 ? totalInvestment / annualGain : 99;
      const salaryMultiple = currentSalary > 0 ? expectedSalary / currentSalary : expectedSalary / 4;

      // ROI score: payback (50%), salary multiple (30%), tier (20%)
      const paybackScore = Math.max(0, 100 - paybackYears * 15); // 6.6 yrs → 0
      const multipleScore = Math.min(100, salaryMultiple * 25);
      const tierScore = (TIER_RANK[c.tier || "Tier 2"] || 2) * 33;
      const roiScore = Math.round(paybackScore * 0.5 + multipleScore * 0.3 + tierScore * 0.2);

      return {
        name: c.name,
        slug: c.slug,
        city: c.city,
        state: c.state,
        tier: c.tier || "Tier 2",
        fees_lakhs: fees,
        expected_salary_lakhs: Math.round(expectedSalary * 10) / 10,
        total_investment_lakhs: Math.round(totalInvestment * 10) / 10,
        payback_years: Math.round(paybackYears * 10) / 10,
        salary_multiple: Math.round(salaryMultiple * 10) / 10,
        roi_score: roiScore,
        bucket: bucketCollege(c.tier || "Tier 2", body.expected_tier),
        ranking: c.ranking,
        top_recruiters: c.top_recruiters?.slice(0, 4) || [],
      };
    }).sort((a, b) => b.roi_score - a.roi_score);

    // Bucket allocation
    const dream = computed.filter(c => c.bucket === "Dream").slice(0, 5);
    const target = computed.filter(c => c.bucket === "Target").slice(0, 6);
    const safe = computed.filter(c => c.bucket === "Safe").slice(0, 5);

    // Headline metrics — use TOP college from target bucket (or best overall)
    const headlineCollege = target[0] || computed[0];
    const headlineFees = headlineCollege?.fees_lakhs || body.budget_lakhs || 15;
    const headlineSalary = headlineCollege?.expected_salary_lakhs || 18;
    const totalInvestment = headlineFees + currentSalary * 2;
    const paybackYears = headlineSalary > currentSalary
      ? totalInvestment / Math.max(headlineSalary - currentSalary, 0.5)
      : 99;

    // Avg ROI score → category
    const topRoiAvg = computed.slice(0, 10).reduce((a, c) => a + c.roi_score, 0) / Math.max(computed.slice(0, 10).length, 1);
    const roiCategory = topRoiAvg >= 70 ? "High" : topRoiAvg >= 45 ? "Medium" : "Low";

    // ===== AI narrative layer =====
    const studentName = body.name.split(" ")[0];
    const aiPrompt = `You are an MBA ROI advisor. Generate a personalized ROI report for ${studentName}.

USER PROFILE:
- Name: ${body.name}
- Graduation Stream: ${body.graduation_stream}
- Current Salary: ₹${currentSalary} LPA
- Work Experience: ${workExp} years
- Target Exams: ${body.target_exams.join(", ")}
- Expected College Tier: ${body.expected_tier}
- Preferred Specialization: ${body.preferred_specialization || "Open"}
- MBA Budget: ₹${body.budget_lakhs} Lakhs
- Preferred Location: ${body.preferred_location || "India"}

COMPUTED ROI METRICS (deterministic):
- Total Investment (best-fit target college): ₹${totalInvestment.toFixed(1)} Lakhs (fees + opportunity cost)
- Expected Post-MBA Salary: ₹${headlineSalary.toFixed(1)} LPA
- Payback Period: ${paybackYears.toFixed(1)} years
- Top Avg ROI Score: ${topRoiAvg.toFixed(0)}/100 (${roiCategory})

TOP DREAM COLLEGES: ${dream.slice(0, 3).map(c => `${c.name} (Payback ${c.payback_years}yr, ROI ${c.roi_score})`).join("; ") || "Limited matches"}
TOP TARGET COLLEGES: ${target.slice(0, 3).map(c => `${c.name} (Payback ${c.payback_years}yr, ROI ${c.roi_score})`).join("; ") || "Limited matches"}
TOP SAFE COLLEGES: ${safe.slice(0, 3).map(c => `${c.name} (Payback ${c.payback_years}yr, ROI ${c.roi_score})`).join("; ") || "Limited matches"}

Write a warm, advisor-like narrative addressing ${studentName} by name. Use specific numbers from the profile. Be honest about risks and clear about whether MBA makes sense NOW for this person.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are 'B School Buzz ROI Advisor' — a warm, data-driven MBA ROI counselor. Always address the student by their first name and reference their specific numbers." },
          { role: "user", content: aiPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_roi_report",
            description: "Generate a personalized MBA ROI narrative report",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["Strong Yes", "Yes — With Caveats", "Wait & Strengthen Profile", "Reconsider"] },
                verdict_summary: { type: "string", description: "2-3 sentence answer to: Should you do an MBA now? Address student by first name." },
                executive_summary: { type: "string", description: "150-200 word personalized executive summary using student's actual numbers" },
                why_mba_makes_sense: { type: "array", items: { type: "string" }, description: "3-4 reasons MBA fits this profile" },
                why_mba_might_not: { type: "array", items: { type: "string" }, description: "2-3 honest risk factors / red flags" },
                dream_narrative: { type: "string", description: "1-2 sentence narrative for dream colleges" },
                target_narrative: { type: "string", description: "1-2 sentence narrative for target colleges" },
                safe_narrative: { type: "string", description: "1-2 sentence narrative for safe / safety-net colleges" },
                risk_level: { type: "string", enum: ["Low", "Moderate", "High", "Very High"] },
                risk_analysis: { type: "string", description: "Financial risk paragraph (100-150 words)" },
                backup_suggestions: { type: "array", items: { type: "string" }, description: "3-4 backup strategies if MBA plan fails" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["critical", "high", "medium"] },
                    },
                    required: ["title", "description", "priority"],
                  },
                  description: "4-6 actionable recommendations",
                },
                final_verdict: { type: "string", description: "Final 3-4 line verdict — be decisive" },
                next_steps: { type: "array", items: { type: "string" }, description: "4-5 immediate next steps" },
              },
              required: ["verdict", "verdict_summary", "executive_summary", "why_mba_makes_sense", "why_mba_might_not", "dream_narrative", "target_narrative", "safe_narrative", "risk_level", "risk_analysis", "backup_suggestions", "recommendations", "final_verdict", "next_steps"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_roi_report" } },
      }),
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
    const { data: saved, error: saveErr } = await sb.from("roi_analyses").insert({
      user_id: body.user_id || null,
      name: body.name,
      email: body.email,
      phone: body.phone,
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
      college_recommendations: { dream, target, safe, all_top: computed.slice(0, 20) },
      report_unlocked: false,
    }).select().single();

    if (saveErr) console.error("DB save error:", saveErr);

    return new Response(JSON.stringify({
      analysis_id: saved?.id,
      profile: {
        name: body.name, graduation_stream: body.graduation_stream,
        current_salary_lakhs: currentSalary, work_experience_years: workExp,
        target_exams: body.target_exams, expected_tier: body.expected_tier,
        preferred_specialization: body.preferred_specialization,
        budget_lakhs: body.budget_lakhs, preferred_location: body.preferred_location,
      },
      metrics: {
        total_investment_lakhs: Math.round(totalInvestment * 10) / 10,
        expected_salary_lakhs: Math.round(headlineSalary * 10) / 10,
        current_salary_lakhs: currentSalary,
        payback_years: Math.round(paybackYears * 10) / 10,
        roi_score: Math.round(topRoiAvg),
        roi_category: roiCategory,
      },
      colleges: { dream, target, safe, all_top: computed.slice(0, 20) },
      ai: aiInsights,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("roi-calculator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
