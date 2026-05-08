// Per-model pricing for Lovable AI Gateway (USD per 1M tokens).
// Source: Lovable AI pricing as of 2026 — kept in one place so the admin
// dashboard can recompute historical cost accurately even if old logs were
// written with a flat-rate estimate.
//
// Prices are PROMPT (input) / COMPLETION (output) per 1M tokens.

export interface ModelPrice {
  promptPerM: number;   // USD per 1M prompt tokens
  completionPerM: number; // USD per 1M completion tokens
}

// Conservative published rates. If a model is missing we fall back to
// gemini-2.5-flash pricing (the most-used default).
export const MODEL_PRICING: Record<string, ModelPrice> = {
  // Google Gemini family
  "google/gemini-2.5-pro":              { promptPerM: 1.25,  completionPerM: 10.0 },
  "google/gemini-3.1-pro-preview":      { promptPerM: 1.25,  completionPerM: 10.0 },
  "google/gemini-3-flash-preview":      { promptPerM: 0.30,  completionPerM: 2.50 },
  "google/gemini-2.5-flash":            { promptPerM: 0.30,  completionPerM: 2.50 },
  "google/gemini-2.5-flash-lite":       { promptPerM: 0.10,  completionPerM: 0.40 },
  "google/gemini-2.5-flash-image":      { promptPerM: 0.30,  completionPerM: 2.50 },
  "google/gemini-3-pro-image-preview":  { promptPerM: 1.25,  completionPerM: 10.0 },
  "google/gemini-3.1-flash-image-preview": { promptPerM: 0.30, completionPerM: 2.50 },

  // OpenAI GPT-5 family
  "openai/gpt-5":      { promptPerM: 1.25, completionPerM: 10.0 },
  "openai/gpt-5-mini": { promptPerM: 0.25, completionPerM: 2.0 },
  "openai/gpt-5-nano": { promptPerM: 0.05, completionPerM: 0.40 },
  "openai/gpt-5.2":    { promptPerM: 1.50, completionPerM: 12.0 },

  // OpenAI GPT-4o family (used by mock question generator)
  "openai/gpt-4o":      { promptPerM: 2.50, completionPerM: 10.0 },
  "openai/gpt-4o-mini": { promptPerM: 0.15, completionPerM: 0.60 },
  "gpt-4o":             { promptPerM: 2.50, completionPerM: 10.0 },
  "gpt-4o-mini":        { promptPerM: 0.15, completionPerM: 0.60 },
};

const FALLBACK: ModelPrice = MODEL_PRICING["google/gemini-2.5-flash"];

/**
 * Recompute the USD cost for a single AI call based on the model and token
 * breakdown. This is the canonical calculation used across the admin
 * dashboards — do NOT trust the `estimated_cost` column directly because old
 * logs were written with a flat 0.000002/token rate that is wildly wrong for
 * pro models and overpriced for nano models.
 */
export function computeAICost(args: {
  model: string | null | undefined;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}): number {
  const key = (args.model || "").trim();
  const price = MODEL_PRICING[key] || FALLBACK;
  const prompt = Number(args.promptTokens) || 0;
  const completion = Number(args.completionTokens) || 0;

  // If we somehow only have total tokens, split 70/30 (typical input-heavy
  // tool-calling workload) to stay in the right order of magnitude.
  if (!prompt && !completion && args.totalTokens) {
    const t = Number(args.totalTokens) || 0;
    const p = t * 0.7;
    const c = t * 0.3;
    return (p * price.promptPerM + c * price.completionPerM) / 1_000_000;
  }

  return (prompt * price.promptPerM + completion * price.completionPerM) / 1_000_000;
}

export function modelLabel(model: string | null | undefined): string {
  if (!model) return "unknown";
  return model.split("/").pop() || model;
}
