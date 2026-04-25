// Generates AI-powered strengths, weaknesses, and study recommendations
// from a completed mock attempt's topic & section breakdown.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { attempt_id } = await req.json();
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: attempt } = await admin
      .from("mock_attempts").select("*").eq("id", attempt_id).maybeSingle();
    if (!attempt || attempt.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: test } = await admin
      .from("mock_tests").select("name, exam_code, category").eq("id", attempt.test_id).maybeSingle();

    const payload = {
      test: test?.name,
      exam: test?.exam_code,
      category: test?.category,
      total_score: attempt.total_score,
      max_score: attempt.max_score,
      percentile: attempt.percentile,
      accuracy: attempt.accuracy,
      sectional: attempt.sectional_scores,
      topics: attempt.topic_breakdown,
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys =
      "You are an elite MBA entrance exam coach (CAT/XAT/SNAP/NMAT). Given a student's mock test results, return STRICT JSON with: strengths (array of {area, evidence, suggestion}), weaknesses (array of {area, evidence, suggestion, priority: 'high'|'medium'|'low'}), recommendations (array of {title, action, time_commitment, expected_impact}), study_plan (array of 7 day-objects {day, focus, hours, tasks: string[]}), summary (string, 3-4 sentences, encouraging but honest). No prose outside JSON.";

    const user_msg =
      "Analyze this mock attempt and produce the JSON. Identify the 3 strongest and 3 weakest topics. Recommendations should be specific to MBA entrance prep (e.g., RC pacing, LRDI set selection, QA arithmetic drills). Data:\n" +
      JSON.stringify(payload, null, 2);

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user_msg },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: txt }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    return new Response(JSON.stringify({ insights: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
