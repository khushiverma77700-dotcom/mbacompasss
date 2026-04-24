import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const OPENAI_COMPAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3.1-pro-preview": { input: 1.25, output: 10.0 },
  "gemini-3-flash-preview": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
};

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

function resolveModelId(model?: string): string {
  const raw = (model || "google/gemini-3-flash-preview").trim();
  if (MODEL_ALIASES[raw]) return MODEL_ALIASES[raw];
  return raw.replace(/^google\//, "");
}

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
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  [k: string]: any;
}

interface CallOptions {
  signal?: AbortSignal;
  feature?: string;
  userId?: string | null;
  maxRetries?: number;
  skipLog?: boolean;
}

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
  const { signal, feature = "unknown", userId = null, maxRetries = 3, skipLog = false } = opts;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const isStream = body.stream === true;
  const resolvedModel = resolveModelId(body.model);

  if (!geminiKey) {
    const err = "GEMINI_API_KEY is not configured.";
    console.error(`[aiGateway][${feature}] ${err}`);
    if (!skipLog) {
      await logUsage({
        feature,
        model: resolvedModel,
        userId,
        provider: "gemini-openai-compat",
        status: "error",
        errorMessage: err,
        latencyMs: 0,
      });
    }
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (Array.isArray(body.tools)) {
    const validation = validateToolSpec(body.tools);
    if (!validation.ok) {
      const err = `Invalid tool spec: ${validation.error}`;
      console.error(`[aiGateway][${feature}] ${err}`);
      if (!skipLog) {
        await logUsage({
          feature,
          model: resolvedModel,
          userId,
          provider: "validation",
          status: "error",
          errorMessage: err,
          latencyMs: 0,
        });
      }
      return new Response(JSON.stringify({ error: err }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const payload = buildOpenAICompatPayload(body, resolvedModel);
  const startedAt = Date.now();

  try {
    const resp = await withRetry(
      () => callGeminiOpenAICompat(payload, geminiKey, signal),
      { maxRetries, label: `gemini-openai-compat[${feature}]` },
    );

    if (!skipLog) {
      if (resp.ok && !isStream) {
        const cloned = resp.clone();
        cloned.text()
          .then((text) => {
            const data = parseJSONSafely(text);
            return logUsage({
              feature,
              model: resolvedModel,
              userId,
              provider: "gemini-openai-compat",
              status: "success",
              latencyMs: Date.now() - startedAt,
              usage: data?.usage,
            });
          })
          .catch(() => {});
      } else if (resp.ok && isStream) {
        logUsage({
          feature,
          model: resolvedModel,
          userId,
          provider: "gemini-openai-compat-stream",
          status: "success",
          latencyMs: Date.now() - startedAt,
        }).catch(() => {});
      } else {
        const cloned = resp.clone();
        cloned.text()
          .then((text) => logUsage({
            feature,
            model: resolvedModel,
            userId,
            provider: "gemini-openai-compat",
            status: "error",
            errorMessage: `${resp.status}: ${extractErrorMessage(text)}`,
            latencyMs: Date.now() - startedAt,
          }))
          .catch(() => {});
      }
    }

    return resp;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[aiGateway][${feature}] Gemini call threw:`, msg);
    if (!skipLog) {
      await logUsage({
        feature,
        model: resolvedModel,
        userId,
        provider: "gemini-openai-compat",
        status: "error",
        errorMessage: msg,
        latencyMs: Date.now() - startedAt,
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function buildOpenAICompatPayload(body: ChatBody, model: string) {
  const maxTokens = body.max_tokens ?? body.generationConfig?.maxOutputTokens;
  const temperature = body.temperature ?? body.generationConfig?.temperature;
  const reasoningEffort = typeof body.reasoning?.effort === "string"
    ? body.reasoning.effort
    : undefined;

  const payload: Record<string, unknown> = {
    model,
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
  if (reasoningEffort) payload.reasoning_effort = reasoningEffort;

  return payload;
}

async function callGeminiOpenAICompat(
  payload: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Response> {
  const upstream = await fetch(OPENAI_COMPAT_URL, {
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
  const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
  let lastResp: Response | undefined;
  let lastErr: unknown;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      const resp = await fn();
      if (!RETRYABLE.has(resp.status)) return resp;
      lastResp = resp;
      console.warn(`[aiGateway:retry] ${opts.label} attempt ${attempt + 1} got ${resp.status}`);
    } catch (e) {
      lastErr = e;
      console.warn(`[aiGateway:retry] ${opts.label} attempt ${attempt + 1} threw: ${e instanceof Error ? e.message : e}`);
    }

    if (attempt < opts.maxRetries - 1) {
      const base = 500 * Math.pow(3, attempt);
      const jitter = Math.random() * 300;
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
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorMessage(text: string): string {
  const parsed = parseJSONSafely(text);
  const message = parsed?.error?.message || parsed?.error || text;
  return String(message).slice(0, 500);
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
