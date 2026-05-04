// Public edge function: AI-powered waitlist conversion predictor.
// Uses Lovable AI Gateway with Perplexity-style grounding via the model's training,
// combined with our internal RTI movement data for a calibrated probability.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_API_KEY = (await getCredential("OPENAI_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { category, institute, waitlist_number, cat_percentile, gender, academic_bg, work_ex_months } = body || {};

    if (!institute || !waitlist_number || !category) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: movement } = await sb.from("iim_waitlist_movement")
      .select("college_short,college_name,category,wl_2021,wl_2022,wl_2023,wl_2024,wl_2025,wl_2026_est,five_yr_avg,trend")
      .eq("is_active", true);

    const row = (movement || []).find((m: any) =>
      (m.college_short === institute || m.college_name === institute) && m.category === category
    );

    // Base statistical probability from RTI data
    const wl = parseInt(String(waitlist_number));
    const avg = row?.five_yr_avg || row?.wl_2025 || 0;
    let baseProb = 0;
    if (avg > 0 && !isNaN(wl)) {
      baseProb = Math.max(0, Math.min(100, Math.round((1 - (wl / (avg * 1.25))) * 100)));
    }

    const prompt = `You are a top MBA admissions analyst with deep knowledge of IIM/IIT/non-IIM waitlist movement, RTI data and 2024-2026 admission trends.

CANDIDATE PROFILE:
- Target institute: ${institute}
- Category: ${category}
- Waitlist number: ${wl}
- CAT percentile: ${cat_percentile || "not provided"}
- Gender: ${gender || "not provided"}
- Academic background: ${academic_bg || "not provided"}
- Work experience: ${work_ex_months || 0} months

HISTORICAL DATA (RTI-verified) for ${institute} - ${category}:
${row ? `2021:${row.wl_2021} | 2022:${row.wl_2022} | 2023:${row.wl_2023} | 2024:${row.wl_2024} | 2025:${row.wl_2025} | 2026E:${row.wl_2026_est} | 5yr avg:${row.five_yr_avg} | trend:${row.trend}` : "No movement data — use general 2024-2025 IIM trends from your knowledge."}

Statistical baseline probability (from RTI moving average): ${baseProb}%

TASK: Adjust the probability using your knowledge of:
- Latest 2026 admission cycle developments, batch-size changes, diversity quotas
- How CAT %ile, gender diversity points, academic diversity (non-engineer bonus) and work-ex affect IIM final selection
- Trend direction (rising/falling) for this category at this institute

Return STRICT JSON ONLY:
{
  "prob": <0-100 final probability integer>,
  "verdict": "<one of: Excellent, Strong, Borderline, Tough, Very Low>",
  "analysis": "<2-3 sentences explaining the reasoning, mentioning concrete numbers and trends>",
  "tips": ["<actionable tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"],
  "comparable_options": ["<2-3 backup IIMs/B-schools where this profile has higher chance>"]
}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 3200,
        reasoning_effort: "minimal",
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI Gateway error: ${aiRes.status} ${txt.slice(0, 200)}`);
    }
    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      ok: true,
      base_prob: baseProb,
      prob: parsed.prob ?? baseProb,
      verdict: parsed.verdict || (baseProb >= 70 ? "Excellent" : baseProb >= 45 ? "Strong" : baseProb >= 25 ? "Borderline" : "Tough"),
      analysis: parsed.analysis || `Based on RTI movement averaging ${avg} for ${category} at ${institute}, your probability is statistically ${baseProb}%.`,
      tips: parsed.tips || ["Keep applying to non-IIM B-schools as backup", "Prepare GD-PI thoroughly", "Track waitlist movement bulletins weekly"],
      comparable_options: parsed.comparable_options || [],
      historical: row ? {
        five_yr_avg: row.five_yr_avg,
        wl_2025: row.wl_2025,
        wl_2026_est: row.wl_2026_est,
        trend: row.trend,
      } : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
