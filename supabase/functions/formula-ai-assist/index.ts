// Lovable AI assistant for a single formula — explain simpler, derive, shortcut, worked example.
import { logAIUsage } from "../_shared/aiUsageLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Mode = "explain_simpler" | "derive_step" | "shortcut_tip" | "worked_example";

const MODE_PROMPT: Record<Mode, string> = {
  explain_simpler:
    "Explain this MBA quant formula in the simplest possible English for a CAT aspirant. Use a short real-world analogy. 5-8 sentences. Markdown allowed.",
  derive_step:
    "Derive this formula step-by-step. Each step on its own line. Use plain text math with clear notation. Keep it concise.",
  shortcut_tip:
    "Give 3 exam-level shortcut tricks for applying this formula under time pressure. Bullet list. Include when to use each shortcut.",
  worked_example:
    "Give one CAT-level worked example using this formula. Format: **Problem:** ... **Step 1:** ... **Step 2:** ... **Answer:** ... End with one common mistake to avoid.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const { mode, formula } = await req.json();
    if (!mode || !MODE_PROMPT[mode as Mode]) {
      return new Response(JSON.stringify({ error: "invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!formula?.name || !formula?.expression) {
      return new Response(JSON.stringify({ error: "formula required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = "You are an expert MBA quant tutor specializing in CAT, XAT, NMAT, SNAP, CMAT, and IIFT preparation. Be precise, concise, and exam-focused.";
    const user = [
      MODE_PROMPT[mode as Mode],
      "",
      `Formula: **${formula.name}**`,
      `Expression: ${formula.expression}`,
      formula.topic_slug ? `Topic: ${formula.topic_slug}` : "",
      formula.explanation ? `Context: ${formula.explanation.slice(0, 400)}` : "",
    ].filter(Boolean).join("\n");

    const model = "openai/gpt-5-mini";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        stream: false,
      }),
    });

    if (resp.status === 429) {
      await logAIUsage({ feature: "formula-ai-assist", model, status: "rate_limited", latencyMs: Date.now() - started });
      return new Response(JSON.stringify({ error: "Rate limit hit, please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      await logAIUsage({ feature: "formula-ai-assist", model, status: "credit_exhausted", latencyMs: Date.now() - started });
      return new Response(JSON.stringify({ error: "AI credits exhausted. Top up to continue." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      await logAIUsage({ feature: "formula-ai-assist", model, status: "error", errorMsg: t.slice(0, 500), latencyMs: Date.now() - started });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || "";
    await logAIUsage({ feature: "formula-ai-assist", model, aiData: data, latencyMs: Date.now() - started });

    return new Response(JSON.stringify({ text, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("formula-ai-assist", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
