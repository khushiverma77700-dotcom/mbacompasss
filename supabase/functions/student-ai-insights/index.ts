// AI insights & study plan generator for the student dashboard
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "plan"; // 'plan' | 'insight'

    // Pull profile + recent attempts
    const [{ data: profile }, { data: attempts }] = await Promise.all([
      supabase.from("student_study_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("mock_attempts").select("total_score, max_score, percentile, accuracy, sectional_scores, submitted_at, status")
        .eq("user_id", user.id).in("status", ["submitted", "auto_submitted"])
        .order("submitted_at", { ascending: false }).limit(10),
    ]);

    const ctx = {
      target_percentile: profile?.target_percentile,
      target_colleges: profile?.target_colleges,
      current_level: profile?.current_level,
      strong_sections: profile?.strong_sections,
      weak_sections: profile?.weak_sections,
      daily_hours: profile?.daily_hours,
      attempt_year: profile?.attempt_year,
      recent_attempts: (attempts || []).map((a: any) => ({
        percentile: a.percentile, accuracy: a.accuracy, score: a.total_score,
        max: a.max_score, sectional: a.sectional_scores,
      })),
    };

    const systemPrompt = mode === "insight"
      ? `You are an elite CAT coach. Given a student's profile and recent mock attempts, produce 4-6 sharp, personalised, actionable insights. Be specific (mention sections, accuracy %, time strategy). No fluff. Return strict JSON with key "insights": string[].`
      : `You are an elite CAT coach. Build a focused weekly study plan tailored to the student's target percentile and current level. Return strict JSON with keys:
- "summary": one-line motivating headline
- "weekly_split": { "QA": "...", "VARC": "...", "DILR": "...", "Mocks": "..." }  (each ~10-25 words)
- "daily_template": [{ "day": "Mon", "tasks": [{ "section": "QA|VARC|DILR|Mock", "title": "...", "minutes": number }] }] for all 7 days
- "focus_topics": string[] (5-8 weak topics to prioritise)
- "predicted_percentile": number (0-100, projection if plan followed for 60 days)`;

    const userPrompt = `Student context:\n${JSON.stringify(ctx, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited, please try again in a moment." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add credits in Workspace settings." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }
    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    // Persist
    const updates: any = mode === "insight"
      ? { ai_insights: parsed, ai_generated_at: new Date().toISOString() }
      : { ai_plan: parsed, ai_generated_at: new Date().toISOString() };

    if (profile) {
      await supabase.from("student_study_profile").update(updates).eq("user_id", user.id);
    } else {
      await supabase.from("student_study_profile").insert({ user_id: user.id, ...updates });
    }

    return json({ ok: true, result: parsed });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
