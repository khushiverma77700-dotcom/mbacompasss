import { requireUser } from "../_shared/requireUser.ts";
// Generate one practice MCQ for a formula via tool calling.
import { logAIUsage } from "../_shared/aiUsageLog.ts";
import { getCredential } from "../_shared/getCredential.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
// POLICY: all AI traffic goes through the shared OpenAI-only gateway
// (Suyash / Vaibhav slots from Admin → API Keys & Secrets). This shim keeps the
// existing OpenAI-compatible request bodies working.
const aiChatFetch = (_url: string, init: { body: string }) =>
  callAIGateway(JSON.parse(init.body), { feature: "formula-practice-generate" });


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _authFail = await requireUser(req, corsHeaders);
  if (_authFail) return _authFail;
  const started = Date.now();
  try {
    const { formula, difficulty = "intermediate" } = await req.json();
    if (!formula?.name || !formula?.expression) {
      return new Response(JSON.stringify({ error: "formula required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const GEMINI_API_KEY = await getCredential("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const diffLabel = difficulty === "beginner" ? "easy" : difficulty === "advanced" ? "hard CAT-level" : difficulty === "cat" ? "CAT-level" : "medium";

    const system = "You are an expert MBA quant question setter. Create original, exam-quality MCQs with realistic numbers and exactly one correct option.";
    const user = `Create one ${diffLabel} practice MCQ that requires applying this formula:

Formula: ${formula.name}
Expression: ${formula.expression}
Topic: ${formula.topic_slug || "quant"}

Rules:
- Exactly 4 distinct numeric or text options.
- correct_index is 0-based.
- Solution must show every step.
- Avoid trivial direct-plug-in unless difficulty is easy.`;

    const tool = {
      type: "function",
      function: {
        name: "emit_question",
        description: "Return the practice question.",
        parameters: {
          type: "object",
          properties: {
            question_text: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            correct_index: { type: "integer", minimum: 0, maximum: 3 },
            solution: { type: "string", description: "Step-by-step solution in markdown" },
            common_mistake: { type: "string" },
          },
          required: ["question_text", "options", "correct_index", "solution"],
          additionalProperties: false,
        },
      },
    };

    const model = "gemini-2.5-flash";
    const resp = await aiChatFetch("ai", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_question" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit, retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      await logAIUsage({ feature: "formula-practice-generate", model, status: "error", errorMsg: t.slice(0,500), latencyMs: Date.now() - started });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = null;
    try { parsed = JSON.parse(call?.function?.arguments || "{}"); } catch { parsed = null; }
    await logAIUsage({ feature: "formula-practice-generate", model, aiData: data, latencyMs: Date.now() - started });

    if (!parsed?.question_text || !Array.isArray(parsed?.options) || parsed.options.length !== 4) {
      return new Response(JSON.stringify({ error: "Malformed AI response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ...parsed, difficulty }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("formula-practice-generate", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
