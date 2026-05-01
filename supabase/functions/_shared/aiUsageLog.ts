// Shared AI usage logger — call from any edge function after an AI request.
// Normalizes provider/model and captures latency for the admin dashboards.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

interface AIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3.1-pro-preview": { input: 1.25, output: 10.0 },
  "gemini-3-flash-preview": { input: 0.30, output: 2.50 },
  "gemini-2.5-pro":         { input: 1.25, output: 10.0 },
  "gemini-2.5-flash":       { input: 0.30, output: 2.50 },
  "gemini-2.5-flash-lite":  { input: 0.10, output: 0.40 },
  "gpt-5":                  { input: 1.25, output: 10.0 },
  "gpt-5-mini":             { input: 0.25, output: 2.00 },
  "gpt-5-nano":             { input: 0.05, output: 0.40 },
};

export function splitProviderModel(modelInput: string | null | undefined): { provider: string; model: string } {
  const raw = (modelInput || "unknown").trim();
  if (raw.includes("/")) {
    const [p, ...rest] = raw.split("/");
    return { provider: p.toLowerCase(), model: rest.join("/") };
  }
  // Heuristic for legacy un-prefixed values
  if (raw.startsWith("gemini")) return { provider: "google", model: raw };
  if (raw.startsWith("gpt")) return { provider: "openai", model: raw };
  return { provider: "unknown", model: raw };
}

function priceFor(model: string, usage: AIUsage): number {
  const p = PRICING[model];
  if (!p) return (usage.total_tokens || 0) * 0.000002;
  const inTok = usage.prompt_tokens || 0;
  const outTok = usage.completion_tokens || 0;
  return (inTok * p.input + outTok * p.output) / 1_000_000;
}

export async function logAIUsage(opts: {
  feature: string;
  model: string | null | undefined;
  aiData?: { usage?: AIUsage } | null;
  status?: "success" | "error" | "rate_limited" | "credit_exhausted";
  errorMsg?: string | null;
  latencyMs?: number | null;
  userId?: string | null;
}): Promise<void> {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { provider, model } = splitProviderModel(opts.model);
    const usage = opts.aiData?.usage || {};
    const cost = priceFor(model, usage);

    const { error } = await sb.from("ai_usage_logs").insert({
      feature: opts.feature,
      provider,
      model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost: cost,
      status: opts.status || "success",
      error_message: opts.errorMsg || null,
      latency_ms: opts.latencyMs ?? null,
      user_id: opts.userId ?? null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
  } catch (e) {
    console.error("[ai-usage-log] Exception:", e instanceof Error ? e.message : e);
  }
}
