// AI Gateway Test Endpoint
// POST /functions/v1/ai-gateway-test
// Body: { prompt?: string, model?: string }
// Runs the same prompt through (1) Gemini direct (if GEMINI_API_KEY set)
// and (2) Lovable AI Gateway, then returns latency, output, tokens, cost.
// Useful for QA / verifying both providers work.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ProviderResult {
  provider: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  output?: string;
  tokens?: { prompt: number; completion: number; total: number };
  estimatedCost?: number;
  error?: string;
}

async function runGeminiDirect(prompt: string, model: string, apiKey: string): Promise<ProviderResult> {
  const start = Date.now();
  try {
    const modelId = model.replace(/^google\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });
    const latencyMs = Date.now() - start;
    if (!resp.ok) {
      return { provider: "gemini-direct", status: resp.status, ok: false, latencyMs, error: (await resp.text()).slice(0, 300) };
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = data.usageMetadata;
    return {
      provider: "gemini-direct",
      status: 200,
      ok: true,
      latencyMs,
      output: text,
      tokens: { prompt: usage?.promptTokenCount ?? 0, completion: usage?.candidatesTokenCount ?? 0, total: usage?.totalTokenCount ?? 0 },
      estimatedCost: ((usage?.promptTokenCount ?? 0) * 0.30 + (usage?.candidatesTokenCount ?? 0) * 2.50) / 1_000_000,
    };
  } catch (e) {
    return { provider: "gemini-direct", status: 0, ok: false, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

async function runLovableGateway(prompt: string, model: string, apiKey: string): Promise<ProviderResult> {
  const start = Date.now();
  try {
    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
    });
    const latencyMs = Date.now() - start;
    if (!resp.ok) {
      return { provider: "lovable-gateway", status: resp.status, ok: false, latencyMs, error: (await resp.text()).slice(0, 300) };
    }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage;
    return {
      provider: "lovable-gateway",
      status: 200,
      ok: true,
      latencyMs,
      output: text,
      tokens: { prompt: usage?.prompt_tokens ?? 0, completion: usage?.completion_tokens ?? 0, total: usage?.total_tokens ?? 0 },
      estimatedCost: ((usage?.prompt_tokens ?? 0) * 0.30 + (usage?.completion_tokens ?? 0) * 2.50) / 1_000_000,
    };
  } catch (e) {
    return { provider: "lovable-gateway", status: 0, ok: false, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const prompt: string = body.prompt || "Reply with exactly: 'AI gateway test OK' and nothing else.";
    const model: string = body.model || "google/gemini-2.5-flash";

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const results: ProviderResult[] = [];

    if (geminiKey && model.startsWith("google/")) {
      results.push(await runGeminiDirect(prompt, model, geminiKey));
    } else if (model.startsWith("google/")) {
      results.push({ provider: "gemini-direct", status: 0, ok: false, latencyMs: 0, error: "GEMINI_API_KEY not configured" });
    }

    if (lovableKey) {
      results.push(await runLovableGateway(prompt, model, lovableKey));
    } else {
      results.push({ provider: "lovable-gateway", status: 0, ok: false, latencyMs: 0, error: "LOVABLE_API_KEY not configured" });
    }

    const summary = {
      prompt,
      model,
      timestamp: new Date().toISOString(),
      results,
      verdict: results.every((r) => r.ok) ? "all-ok"
        : results.some((r) => r.ok) ? "partial"
        : "all-failed",
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
