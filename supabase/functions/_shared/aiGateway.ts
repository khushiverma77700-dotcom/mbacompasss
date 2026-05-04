// AI Gateway — Google Gemini ONLY.
//
// All AI traffic goes directly to Google's OpenAI-compatible Gemini endpoint
// using GEMINI_API_KEY. The interface is kept identical to the previous
// Lovable-AI flow (same OpenAI-compatible payload: messages, tools,
// tool_choice, response_format, stream, reasoning_effort, …) so every edge
// function continues to work unchanged.
//
// Endpoint: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
// Auth:     Authorization: Bearer ${GEMINI_API_KEY}
//
// Speed parity with Lovable AI is achieved by:
//   • Talking to Google directly (no extra hop).
//   • Persistent fetch + small, capped retry/backoff on 5xx only.
//   • Streaming pass-through (no buffering of large generations).
//   • No artificial timeouts on the upstream call.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { getCredential } from "./getCredential.ts";

const GEMINI_OPENAI_COMPAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3.1-pro-preview": { input: 1.25, output: 10.0 },
  "gemini-3-flash-preview": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
};

// Map any legacy "google/…" or "openai/…" model IDs the rest of the codebase
// still passes in to a real Gemini model name.
const MODEL_ALIASES: Record<string, string> = {
  "google/gemini-3-flash-preview": "gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
  "google/gemini-3-pro-image-preview": "gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview": "gemini-3.1-flash-image-preview",
  "google/gemini-2.5-pro": "gemini-2.5-pro",
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "google/gemini-2.5-flash-image": "gemini-2.5-flash-image",
  "openai/gpt-5": "gemini-2.5-pro",
  "openai/gpt-5-mini": "gemini-2.5-flash",
  "openai/gpt-5-nano": "gemini-2.5-flash-lite",
  "openai/gpt-5.2": "gemini-2.5-pro",
};

interface ChatBody {
  model: string;
  messages: Array<{ role: string; content: any }>;
  tools?: any;
  tool_choice?: any;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  response_format?: any;
  reasoning?: any;
  generationConfig?: { maxOutputTokens?: number; temperature?: number };
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  [k: string]: any;
}

export type AIProvider =
  | "gemini"        // Direct Google Gemini (user's GEMINI_API_KEY) — default Flash model
  | "gemini-lite"   // Direct Google Gemini (user's GEMINI_API_KEY) — Flash-Lite (~87% cheaper)
  | "lovable"       // Lovable AI Gateway (Gemini Flash via gateway) — baseline cost
  | "openai-mini"   // Direct OpenAI (user's OPENAI_API_KEY) — gpt-5-mini (~44% cheaper)
  | "openai-nano";  // Direct OpenAI (user's OPENAI_API_KEY) — gpt-5-nano (cheapest)

interface CallOptions {
  signal?: AbortSignal;
  feature?: string;
  userId?: string | null;
  maxRetries?: number;
  skipLog?: boolean;
  /**
   * Which upstream to use. The dashboard's bulk job toggle picks this.
   * All providers accept the same OpenAI-compatible payload (messages, tools,
   * tool_choice, response_format, stream, …) so callers don't need to change.
   */
  provider?: AIProvider;
  /**
   * Cost-routing hint. The gateway automatically picks the cheapest model that
   * preserves output quality for that purpose. Caller's `body.model` is only
   * used when purpose is omitted or set to "long".
   *
   *   "short"      → ~200-token rewrites, slugs, classification, meta tags. → flash-lite (~4× cheaper)
   *   "structured" → tool-calling JSON extraction with small schemas.        → flash-lite
   *   "long"       → multi-paragraph HTML, descriptions, narratives.         → flash (default quality)
   *   "premium"    → reserved; uses caller's model as-is.
   *
   * Routing only kicks in when the caller passes a Gemini Flash-class model
   * (or no model). Pro / image / non-Gemini models are never downgraded.
   */
  purpose?: "short" | "structured" | "long" | "premium";
}

// Cost-router: picks the cheapest Gemini model that preserves output quality.
// Default behavior (no `purpose`) now downgrades Flash-class models to Flash-Lite
// (~10× cheaper) to protect the AI budget. Callers that need full Flash quality
// for long-form content must explicitly pass purpose: "long" or "premium".
// Pro / image / non-Gemini models are never downgraded.
function routeModelForPurpose(model: string | undefined, purpose?: CallOptions["purpose"]): string {
  const requested = (model || "").trim();
  if (purpose === "long" || purpose === "premium") return requested || "google/gemini-2.5-flash";

  // Only auto-downgrade Flash-class models. Pro stays Pro, image stays image.
  const isFlashClass =
    requested === "" ||
    (/flash(?!-lite)/.test(requested.toLowerCase()) && !/image/.test(requested.toLowerCase()));
  if (!isFlashClass) return requested;

  // Map to flash-lite, keeping the same provider-prefix style the caller used.
  if (requested.startsWith("google/")) return "google/gemini-2.5-flash-lite";
  return "gemini-2.5-flash-lite";
}

const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface LogParams {
  feature: string;
  model: string;
  userId?: string | null;
  provider: string;
  status: "success" | "error";
  errorMessage?: string;
  latencyMs: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function callAIGateway(body: ChatBody, opts: CallOptions = {}): Promise<Response> {
  const { signal, feature = "unknown", userId = null, maxRetries = 2, skipLog = false, provider = "openai-mini", purpose } = opts;
  // Loud warning so any caller forgetting to tag itself surfaces in edge logs.
  if (feature === "unknown") {
    console.warn("[aiGateway] UNTAGGED CALL — caller did not pass opts.feature. Please add a feature label so usage can be attributed. Stack:", new Error().stack);
  }
  // Cost router: rewrite body.model based on purpose before any downstream logic uses it.
  const routedModel = routeModelForPurpose(body.model, purpose);
  if (routedModel !== body.model) {
    body = { ...body, model: routedModel };
  }
  const isStream = body.stream === true;
  const startedAt = Date.now();

  // Validate tools spec early — same for both providers.
  if (Array.isArray(body.tools)) {
    const validation = validateToolSpec(body.tools);
    if (!validation.ok) {
      const err = `Invalid tool spec: ${validation.error}`;
      console.error(`[aiGateway][${feature}] ${err}`);
      if (!skipLog) {
        await logUsage({
          feature, model: body.model, userId,
          provider: "validation", status: "error",
          errorMessage: err, latencyMs: 0,
        });
      }
      return new Response(JSON.stringify({ error: err }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Provider: Lovable AI Gateway ─────────────────────────────────────────────
  if (provider === "lovable") {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      const err = "LOVABLE_API_KEY is not configured.";
      console.error(`[aiGateway][${feature}] ${err}`);
      if (!skipLog) {
        await logUsage({ feature, model: body.model, userId, provider: "none", status: "error", errorMessage: err, latencyMs: 0 });
      }
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Lovable AI accepts the model IDs as-is (e.g. "google/gemini-3-flash-preview")
    // so we pass body.model unchanged. We still strip Gemini-only fields just in case.
    const payload = buildLovablePayload(body);
    try {
      const resp = await withRetry(
        () => callUpstream(LOVABLE_GATEWAY_URL, lovableKey, payload, signal),
        { maxRetries, label: `lovable[${feature}]` },
      );
      if (!skipLog) {
        if (resp.ok) logSuccess(resp, isStream, feature, body.model, userId, "lovable", startedAt);
        else await logErrorFromResp(resp, feature, body.model, userId, "lovable", startedAt);
      }
      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[aiGateway][${feature}] Lovable call threw:`, msg);
      if (!skipLog) {
        await logUsage({ feature, model: body.model, userId, provider: "lovable", status: "error", errorMessage: msg, latencyMs: Date.now() - startedAt });
      }
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }

  // ── Provider: Direct OpenAI (user's OPENAI_API_KEY) ──────────────────────────
  if (provider === "openai-mini" || provider === "openai-nano") {
    const openaiKey = (await getCredential("OPENAI_API_KEY"));
    if (!openaiKey) {
      const err = "OPENAI_API_KEY is not configured.";
      console.error(`[aiGateway][${feature}] ${err}`);
      if (!skipLog) {
        await logUsage({ feature, model: body.model, userId, provider: "none", status: "error", errorMessage: err, latencyMs: 0 });
      }
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    // Honor caller's gpt-5 / gpt-5.2 model if explicitly set; otherwise pick mini/nano based on provider tier.
    const callerModel = (body.model || "").trim().replace(/^openai\//, "");
    const isExplicitGpt5 = /^gpt-5(\.\d+)?(-mini|-nano)?$/i.test(callerModel) || /^gpt-5\.2$/i.test(callerModel);
    const openaiModel = isExplicitGpt5 ? callerModel : (provider === "openai-mini" ? "gpt-5-mini" : "gpt-5-nano");
    const payload = buildOpenAICompatPayload(body, openaiModel);
    try {
      const resp = await withRetry(
        () => callUpstream(OPENAI_CHAT_URL, openaiKey, payload, signal),
        { maxRetries, label: `${provider}[${feature}]` },
      );
      if (!skipLog) {
        if (resp.ok) logSuccess(resp, isStream, feature, openaiModel, userId, provider, startedAt);
        else await logErrorFromResp(resp, feature, openaiModel, userId, provider, startedAt);
      }
      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[aiGateway][${feature}] OpenAI call threw:`, msg);
      if (!skipLog) {
        await logUsage({ feature, model: openaiModel, userId, provider, status: "error", errorMessage: msg, latencyMs: Date.now() - startedAt });
      }
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }

  // ── Provider: Direct Gemini (default `gemini` and `gemini-lite`) ─────────────
  const geminiKey = (await getCredential("GEMINI_API_KEY"));
  if (!geminiKey) {
    const err = "GEMINI_API_KEY is not configured.";
    console.error(`[aiGateway][${feature}] ${err}`);
    if (!skipLog) {
      await logUsage({ feature, model: body.model, userId, provider: "none", status: "error", errorMessage: err, latencyMs: 0 });
    }
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // gemini-lite forces flash-lite regardless of caller's model. `gemini`
  // honors the caller's model (already cost-routed by purpose above).
  const geminiModel = provider === "gemini-lite"
    ? "gemini-2.5-flash-lite"
    : resolveGeminiModel(body.model);
  const payload = buildOpenAICompatPayload(body, geminiModel);

  try {
    const resp = await withRetry(
      () => callUpstream(GEMINI_OPENAI_COMPAT_URL, geminiKey, payload, signal),
      { maxRetries, label: `${provider}[${feature}]` },
    );

    if (!skipLog) {
      if (resp.ok) {
        logSuccess(resp, isStream, feature, geminiModel, userId, provider, startedAt);
      } else {
        await logErrorFromResp(resp, feature, geminiModel, userId, provider, startedAt);
      }
    }
    return resp;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[aiGateway][${feature}] Gemini call threw:`, msg);
    if (!skipLog) {
      await logUsage({
        feature, model: geminiModel, userId,
        provider, status: "error",
        errorMessage: msg, latencyMs: Date.now() - startedAt,
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }
}

function buildLovablePayload(body: ChatBody) {
  // Mirror buildOpenAICompatPayload but keep the model ID as-is (Lovable expects "google/..." or "openai/...").
  const maxTokens = body.max_tokens ?? body.generationConfig?.maxOutputTokens;
  const temperature = body.temperature ?? body.generationConfig?.temperature;
  const reasoningEffort = typeof body.reasoning?.effort === "string" ? body.reasoning.effort : undefined;
  const payload: Record<string, unknown> = {
    model: body.model || "google/gemini-3-flash-preview",
    messages: body.messages,
  };
  if (typeof body.stream === "boolean") payload.stream = body.stream;
  if (typeof maxTokens === "number") payload.max_tokens = maxTokens;
  if (typeof temperature === "number") payload.temperature = temperature;
  if (typeof body.top_p === "number") payload.top_p = body.top_p;
  if (typeof body.frequency_penalty === "number") payload.frequency_penalty = body.frequency_penalty;
  if (typeof body.presence_penalty === "number") payload.presence_penalty = body.presence_penalty;
  if (body.response_format) payload.response_format = body.response_format;
  if (Array.isArray(body.tools) && body.tools.length > 0) payload.tools = body.tools;
  if (body.tool_choice) payload.tool_choice = body.tool_choice;
  if (reasoningEffort) payload.reasoning = { effort: reasoningEffort };
  return payload;
}

function resolveGeminiModel(model?: string): string {
  const raw = (model || "gemini-3-flash-preview").trim();
  if (MODEL_ALIASES[raw]) return MODEL_ALIASES[raw];
  return raw.replace(/^google\//, "").replace(/^openai\//, "");
}

function buildOpenAICompatPayload(body: ChatBody, model: string) {
  const maxTokens = body.max_tokens ?? body.generationConfig?.maxOutputTokens;
  const temperature = body.temperature ?? body.generationConfig?.temperature;
  const reasoningEffort = typeof body.reasoning?.effort === "string" ? body.reasoning.effort : undefined;

  // GPT-5 family (and other newer OpenAI reasoning models) require
  // `max_completion_tokens` instead of `max_tokens`, and only support the
  // default temperature (1). Detect by model name.
  const isOpenAINewGen = /^(gpt-5|o\d)/i.test(model);

  const payload: Record<string, unknown> = {
    model,
    messages: body.messages,
  };

  if (typeof body.stream === "boolean") payload.stream = body.stream;
  if (typeof maxTokens === "number") {
    if (isOpenAINewGen) {
      // GPT-5 reasoning models spend tokens on internal reasoning before
      // producing visible output. If the caller's budget is too small the
      // model returns an empty message. Give it generous headroom (at least
      // 4× the visible-output budget, capped at 16k) so tool-calling/JSON
      // generation actually completes.
      const padded = Math.min(Math.max(maxTokens * 4, 4000), 16000);
      payload.max_completion_tokens = padded;
    } else {
      payload.max_tokens = maxTokens;
    }
  }
  if (typeof temperature === "number" && !isOpenAINewGen) payload.temperature = temperature;
  if (typeof body.top_p === "number" && !isOpenAINewGen) payload.top_p = body.top_p;
  if (typeof body.frequency_penalty === "number" && !isOpenAINewGen) payload.frequency_penalty = body.frequency_penalty;
  if (typeof body.presence_penalty === "number" && !isOpenAINewGen) payload.presence_penalty = body.presence_penalty;
  if (body.response_format) payload.response_format = body.response_format;
  if (Array.isArray(body.tools) && body.tools.length > 0) payload.tools = body.tools;
  if (body.tool_choice) payload.tool_choice = body.tool_choice;
  // GPT-5 reasoning models default to "medium" effort which burns the entire
  // token budget on hidden reasoning before producing tool-call output. For
  // structured-extraction workloads we force "minimal" unless the caller
  // explicitly asked for more.
  if (isOpenAINewGen) {
    payload.reasoning_effort = reasoningEffort || "minimal";
  } else if (reasoningEffort) {
    payload.reasoning_effort = reasoningEffort;
  }

  return payload;
}

async function callUpstream(
  url: string,
  apiKey: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (payload.stream === true) {
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}

async function withRetry(
  fn: () => Promise<Response>,
  opts: { maxRetries: number; label: string },
): Promise<Response> {
  const RETRYABLE = new Set([408, 425, 500, 502, 503, 504]);
  let lastResp: Response | undefined;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const resp = await fn();
      if (!RETRYABLE.has(resp.status)) return resp;
      lastResp = resp;
      console.warn(`[aiGateway:retry] ${opts.label} attempt ${attempt + 1} got ${resp.status}`);
    } catch (e) {
      lastErr = e;
      console.warn(`[aiGateway:retry] ${opts.label} attempt ${attempt + 1} threw: ${e instanceof Error ? e.message : e}`);
    }

    if (attempt < opts.maxRetries) {
      const base = 300 * Math.pow(2, attempt);
      const jitter = Math.random() * 150;
      await new Promise((resolve) => setTimeout(resolve, base + jitter));
    }
  }

  if (lastResp) return lastResp;
  throw lastErr ?? new Error("Retry loop exited without response");
}

function validateToolSpec(tools: any[]): { ok: true } | { ok: false; error: string } {
  if (!Array.isArray(tools)) return { ok: false, error: "tools must be an array" };
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    if (!t || typeof t !== "object") return { ok: false, error: `tools[${i}] is not an object` };
    if (t.type !== "function") return { ok: false, error: `tools[${i}].type must be \"function\"` };
    if (!t.function || typeof t.function !== "object") return { ok: false, error: `tools[${i}].function missing` };
    if (typeof t.function.name !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(t.function.name)) {
      return { ok: false, error: `tools[${i}].function.name invalid (must match /^[a-zA-Z0-9_-]{1,64}$/)` };
    }
    if (t.function.parameters && typeof t.function.parameters !== "object") {
      return { ok: false, error: `tools[${i}].function.parameters must be an object` };
    }
  }
  return { ok: true };
}

function parseJSONSafely(text: string): any | null {
  try { return JSON.parse(text); } catch { return null; }
}

function extractErrorMessage(text: string): string {
  const parsed = parseJSONSafely(text);
  const message = parsed?.error?.message || parsed?.error || text;
  return String(message).slice(0, 500);
}

function logSuccess(
  resp: Response, isStream: boolean,
  feature: string, model: string, userId: string | null,
  provider: string, startedAt: number,
) {
  if (isStream) {
    logUsage({
      feature, model, userId,
      provider: `${provider}-stream`, status: "success",
      latencyMs: Date.now() - startedAt,
    }).catch(() => {});
    return;
  }
  const cloned = resp.clone();
  cloned.text()
    .then((text) => {
      const data = parseJSONSafely(text);
      return logUsage({
        feature, model, userId,
        provider, status: "success",
        latencyMs: Date.now() - startedAt,
        usage: data?.usage,
      });
    })
    .catch(() => {});
}

async function logErrorFromResp(
  resp: Response,
  feature: string, model: string, userId: string | null,
  provider: string, startedAt: number,
) {
  try {
    const cloned = resp.clone();
    const text = await cloned.text();
    await logUsage({
      feature, model, userId, provider, status: "error",
      errorMessage: `${resp.status}: ${extractErrorMessage(text)}`,
      latencyMs: Date.now() - startedAt,
    });
  } catch { /* swallow */ }
}

async function logUsage(p: LogParams): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const sb = createClient(url, key);
    const promptTokens = p.usage?.prompt_tokens ?? 0;
    const completionTokens = p.usage?.completion_tokens ?? 0;
    const totalTokens = p.usage?.total_tokens ?? (promptTokens + completionTokens);
    const pricing = PRICING[p.model];
    const cost = pricing
      ? (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000
      : totalTokens * 0.000002;

    await sb.from("ai_usage_logs").insert({
      feature: p.feature,
      provider: p.provider,
      latency_ms: p.latencyMs,
      model: p.model,
      user_id: p.userId,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost: cost,
      status: p.status,
      error_message: p.errorMessage ?? null,
    });
  } catch (e) {
    console.error("[aiGateway:logUsage] Failed:", e instanceof Error ? e.message : e);
  }
}
