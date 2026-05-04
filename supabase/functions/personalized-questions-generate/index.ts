// Admin-only: bulk-generate MCQ questions via OpenAI gpt-4o
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an expert MBA entrance exam question setter (CAT, NMAT, XAT, SNAP, IIFT, CMAT, MAT). Generate high-quality multiple-choice questions with exactly 4 options and ONE correct answer. Questions must be original, exam-realistic, and free of trivia. Respond ONLY by calling the provided tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

    const { exam_code, section, difficulty, count, topic } = await req.json();
    if (!exam_code || !section || !difficulty || !count) {
      return json({ error: "exam_code, section, difficulty, count required" }, 400);
    }
    const n = Math.min(Math.max(parseInt(count), 1), 25);

    const OPENAI_API_KEY = (await getCredential("OPENAI_API_KEY"));
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY missing" }, 500);

    const userPrompt = `Generate ${n} ${difficulty} difficulty multiple-choice questions for exam ${exam_code}, section ${section}${topic ? `, topic: ${topic}` : ""}.
Each question:
- Realistic exam-style (no trivia, no current affairs unless section demands)
- 4 options (A, B, C, D)
- Single correct answer (index 0–3)
- Brief explanation (1–3 sentences)
- 1–2 word topic tag`;

    const tools = [{
      type: "function",
      function: {
        name: "save_questions",
        description: "Save the generated MCQ questions",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                  correct_index: { type: "integer", minimum: 0, maximum: 3 },
                  explanation: { type: "string" },
                  topic: { type: "string" },
                },
                required: ["question_text", "options", "correct_index", "explanation", "topic"],
                additionalProperties: false,
              },
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "save_questions" } },
        temperature: 0.8,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      return json({ error: `OpenAI ${aiResp.status}: ${errText}` }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;
    const questions = args?.questions ?? [];
    if (!questions.length) return json({ error: "No questions returned by AI" }, 500);

    const rows = questions.map((q: any) => ({
      exam_code,
      section,
      difficulty,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      topic: q.topic ?? topic ?? null,
      source: "ai",
      created_by: user.id,
    }));

    const { data: inserted, error: insErr } = await admin
      .from("personalized_questions")
      .insert(rows)
      .select("id");

    if (insErr) return json({ error: insErr.message }, 500);

    return json({ inserted: inserted?.length ?? 0 });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
