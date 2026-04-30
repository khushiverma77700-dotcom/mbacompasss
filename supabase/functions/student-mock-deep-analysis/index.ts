import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await supa.auth.getUser(token);
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { attempt_id } = await req.json();
    if (!attempt_id) return new Response(JSON.stringify({ error: "attempt_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: existing } = await supa.from("mock_ai_deep_analyses").select("*").eq("attempt_id", attempt_id).maybeSingle();
    if (existing) return new Response(JSON.stringify({ analysis: existing, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: attempt } = await supa.from("mock_attempts").select("*").eq("id", attempt_id).eq("user_id", user.id).maybeSingle();
    if (!attempt) return new Response(JSON.stringify({ error: "Attempt not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are an expert CAT/MBA mock test analyst. Analyse this attempt and respond ONLY with strict JSON matching this schema:
{
 "summary": "2-3 line overall assessment",
 "why_lost_marks": [{"reason":"...", "impact":"high|medium|low", "marks_lost": number}],
 "recommendations": [{"title":"...", "detail":"...", "priority":"high|medium|low"}],
 "mistake_patterns": [{"pattern":"...", "frequency":"often|sometimes"}],
 "topic_focus": [{"topic":"...", "section":"VARC|DILR|QA", "action":"..."}],
 "time_insights": {"verdict":"...", "morning_vs_evening":"...", "rc_long_passages":"..."},
 "next_steps": ["...", "...", "..."]
}

Attempt data: ${JSON.stringify({
      score: attempt.total_score, max: attempt.max_score, accuracy: attempt.accuracy,
      total_correct: attempt.total_correct, total_attempted: attempt.total_attempted,
      sections: attempt.sections_data, percentile: attempt.percentile,
    }).slice(0, 6000)}`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 5000,
        reasoning_effort: "minimal",
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const { data: inserted } = await supa.from("mock_ai_deep_analyses").insert({
      user_id: user.id,
      attempt_id,
      test_id: attempt.test_id,
      summary: parsed.summary ?? null,
      why_lost_marks: parsed.why_lost_marks ?? [],
      recommendations: parsed.recommendations ?? [],
      mistake_patterns: parsed.mistake_patterns ?? [],
      topic_focus: parsed.topic_focus ?? [],
      time_insights: parsed.time_insights ?? {},
      next_steps: parsed.next_steps ?? [],
      ai_model: "google/gemini-2.5-flash",
    }).select().single();

    return new Response(JSON.stringify({ analysis: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
