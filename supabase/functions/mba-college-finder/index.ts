import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

import { callAIGateway } from "../_shared/aiGateway.ts";
async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    const { error } = await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0, estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
    else console.log("[ai-usage-log] Logged usage for", feature);
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { preferences } = await req.json();
    if (!preferences || typeof preferences !== "object") {
      return new Response(JSON.stringify({ error: "preferences object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: colleges } = await supabase
      .from("colleges")
      .select("name, slug, city, state, fees, placement_avg, placement_highest, placement_median, courses, exams_accepted, ranking, type, established, accreditations, total_students, description, logo_url, campus_size, top_recruiters")
      .order("ranking", { ascending: true })
      .limit(80);

    const collegeContext = (colleges || []).map((c: any) =>
      `${c.name} | Slug: ${c.slug} | Type: ${c.type || "N/A"} | City: ${c.city || "N/A"}, ${c.state || "N/A"} | Fees: ${c.fees || "N/A"} | Avg Package: ${c.placement_avg || "N/A"} | Highest: ${c.placement_highest || "N/A"} | Median: ${c.placement_median || "N/A"} | Ranking: ${c.ranking || "N/A"} | Exams: ${(c.exams_accepted || []).join(", ")} | Courses: ${(c.courses || []).join(", ")} | Accreditations: ${(c.accreditations || []).join(", ")} | Est: ${c.established || "N/A"} | Students: ${c.total_students || "N/A"} | Campus: ${c.campus_size || "N/A"} | Logo: ${c.logo_url || ""} | Recruiters: ${(c.top_recruiters || []).slice(0, 5).join(", ")}`
    ).join("\n");

    const { collegeTier, targetExams, expectedScore, budget, location, specialization, experience, careerGoal } = preferences;

    const systemPrompt = `You are an expert AI MBA College Advisor. Given user preferences, recommend the best-fit MBA colleges from the database below.

## USER PREFERENCES
- College Tier Preference: ${collegeTier || "any"}
- Target Exams: ${targetExams || "any"}
- Expected Score/Percentile: ${expectedScore || "not specified"}
- Budget: ${budget || "any"}
- Location Preference: ${location || "any"}
- Specialization Interest: ${specialization || "any"}
- Work Experience: ${experience || "any"}
- Career Goal: ${careerGoal || "any"}

## COLLEGE DATABASE
${collegeContext}

## RESPONSE FORMAT
You MUST respond in valid JSON with this exact structure:
{
  "summary": "2-3 sentence personalized summary explaining the overall recommendation strategy",
  "recommendations": [
    {
      "rank": 1,
      "college_name": "Full College Name",
      "college_slug": "slug-from-database",
      "tier": "IIM / Tier 1 / Tier 2",
      "type": "Government / Private / Autonomous",
      "match_score": 92,
      "why_best_fit": "2-3 sentence personalized explanation with specific data points",
      "key_strengths": ["Strength 1", "Strength 2", "Strength 3", "Strength 4"],
      "fees": "₹XX Lakhs",
      "avg_package": "₹XX LPA",
      "highest_package": "₹XX LPA",
      "median_package": "₹XX LPA",
      "roi": "X.Xx",
      "location": "City, State",
      "exams_accepted": ["CAT", "XAT"],
      "specialization_strength": "Finance, Marketing",
      "logo_url": "url or empty",
      "established": "YYYY",
      "campus_size": "XXX acres",
      "total_students": "XXXX+",
      "accreditations": ["AACSB", "EQUIS", "AMBA"],
      "top_recruiters": ["McKinsey", "BCG", "Amazon", "Google"]
    }
  ],
  "pro_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "strategy": {
    "priority_targets": "1-2 sentence advice",
    "if_score_improves": "1-2 sentence advice",
    "budget_alternatives": "1-2 sentence advice"
  }
}

## RULES
- Recommend 4-6 colleges, ranked by match score
- Only use colleges from the database above
- Be realistic about score-college mapping (99+ for IIM-A/B/C, 95+ for other IIMs)
- Calculate ROI as (Avg Package / Fees)
- Match score should reflect how well the college fits ALL user preferences
- If user's profile is weak for targets, still recommend realistic alternatives
- Never make up data — use only what's in the database
- Include ALL available fields (established, campus_size, total_students, accreditations, top_recruiters) from the database
- Ensure valid JSON output with no markdown formatting`;

    const aiResp = await callAIGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Find the best MBA colleges for me based on my preferences. Return JSON only.` },
      ],
      response_format: { type: "json_object" },
    });
    const aiData: any = await aiResp.json().catch(() => ({}));

    const content = aiData?.choices?.[0]?.message?.content || "{}";
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("[mba-college-finder] JSON parse error:", e, "content:", content);
      result = { error: "Failed to parse AI response", raw: content };
    }

    await logAIUsage("mba-college-finder", "google/gemini-3-flash-preview", aiData);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[mba-college-finder] Error:", error);
    await logAIUsage("mba-college-finder", "google/gemini-3-flash-preview", null, "error", error?.message);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
