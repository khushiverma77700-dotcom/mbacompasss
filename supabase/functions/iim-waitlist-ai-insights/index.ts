// Public edge function: returns AI-generated bite-sized insights for the IIM Waitlist page.
// Uses Lovable AI Gateway (no extra key needed). Cached in DB by content hash for 6 hours.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Pull current data
    const [results, movement, apps] = await Promise.all([
      sb.from("iim_waitlist_results").select("college_short,college_name,status,result_date_label,notes").eq("is_active", true).limit(20),
      sb.from("iim_waitlist_movement").select("college_short,category,wl_2025,wl_2026_est,trend").eq("is_active", true).limit(40),
      sb.from("iim_waitlist_applications").select("college_short,batch_size,applications_received,offers_made,waitlisted").eq("is_active", true).limit(20),
    ]);

    const summary = {
      results: results.data || [],
      movement: movement.data || [],
      apps: apps.data || [],
    };

    const prompt = `You are an MBA admissions analyst. Based on the IIM/IIT/Non-IIM 2026 waitlist data below, write EXACTLY 6 short, punchy insights (max 22 words each) for aspirants. Mix of: trend observation, opportunity, warning, prediction, comparison, action tip. Output strict JSON: {"insights":[{"icon":"trending|alert|sparkle|target|clock|trophy","title":"...","text":"..."}]}.
DATA: ${JSON.stringify(summary).slice(0, 6000)}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2400,
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
    try { parsed = JSON.parse(content); } catch { parsed = { insights: [] }; }

    return new Response(JSON.stringify({
      ok: true,
      insights: parsed.insights || [],
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), insights: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
