// Shared AI Gateway helper — GEMINI-DIRECT ONLY.
//
// Policy: 100% Google Gemini API. NO Lovable AI Gateway fallback.
// All AI calls across the platform route through this helper, which calls
// Google's Generative Language API directly using GEMINI_API_KEY.
//
// Features:
//  1. Direct calls to Gemini (cheapest, user-owned billing).
//  2. Streaming support — Gemini streamGenerateContent → OpenAI-style SSE.
//  3. Auto-retry with exponential backoff + jitter on 429/500/502/503/504.
//  4. Auto-logs token usage to ai_usage_logs table.
//  5. Validates OpenAI tool/function schemas before sending to Gemini.
//  6. Normalizes Lovable-style model aliases (e.g. google/gemini-3-flash-preview)
//     to real Google API model IDs so legacy callers keep working.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ─── Approximate per-1M-token pricing (USD) for cost estimation ──────────────
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro":         { input: 1.25, output: 10.00 },
  "gemini-2.5-flash":       { input: 0.30, output:  2.50 },
  "gemini-2.5-flash-lite":  { input: 0.10, output:  0.40 },
  "gemini-2.0-flash":       { input: 0.10, output:  0.40 },
  "gemini-1.5-flash":       { input: 0.075, output: 0.30 },
  "gemini-1.5-pro":         { input: 1.25, output:  5.00 },
};

// Map Lovable AI Gateway aliases / preview names → real Google API model IDs.
// Anything not in this map is passed through (after stripping the "google/" prefix).
const MODEL_ALIASES: Record<string, string> = {
  "google/gemini-3-flash-preview":    "gemini-2.5-flash",
  "google/gemini-3.1-pro-preview":    "gemini-2.5-pro",
  "google/gemini-3-pro-image-preview":"gemini-2.5-flash-image",
  "google/gemini-3.1-flash-image-preview": "gemini-2.5-flash-image",
  "google/gemini-2.5-pro":            "gemini-2.5-pro",
  "google/gemini-2.5-flash":          "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite":     "gemini-2.5-flash-lite",
  "google/gemini-2.5-flash-image":    "gemini-2.5-flash-image",
  // OpenAI aliases — remap to closest Gemini equivalent (Gemini-only policy).
  "openai/gpt-5":         "gemini-2.5-pro",
  "openai/gpt-5-mini":    "gemini-2.5-flash",
  "openai/gpt-5-nano":    "gemini-2.5-flash-lite",
  "openai/gpt-5.2":       "gemini-2.5-pro",
};

function resolveModelId(model: string): string {
  if (MODEL_ALIASES[model]) return MODEL_ALIASES[model];
  return model.replace(/^google\//, "");
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
  [k: string]: any;
}

interface CallOptions {
  signal?: AbortSignal;
  feature?: string;
  userId?: string | null;
  maxRetries?: number;
  skipLog?: boolean;
}

/**
 * Drop-in replacement for `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)`.
 * Routes 100% of traffic to Google Gemini directly. NO Lovable fallback.
 */
export async function callAIGateway(body: ChatBody, opts: CallOptions = {}): Promise<Response> {
  const { signal, feature = "unknown", userId = null, maxRetries = 3, skipLog = false } = opts;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const isStream = body.stream === true;
  const resolvedModel = resolveModelId(body.model || "gemini-2.5-flash");

  if (!geminiKey) {
    const err = "GEMINI_API_KEY is not configured. This platform is Gemini-only — Lovable AI is disabled.";
    console.error(`[aiGateway][${feature}] ${err}`);
    if (!skipLog) await logUsage({ feature, model: resolvedModel, userId, provider: "none", status: "error", errorMessage: err, latencyMs: 0 });
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Validate tool/function schemas if present
  if (Array.isArray(body.tools)) {
    const validation = validateToolSpec(body.tools);
    if (!validation.ok) {
      const err = `Invalid tool spec: ${validation.error}`;
      console.error(`[aiGateway][${feature}] ${err}`);
      if (!skipLog) await logUsage({ feature, model: resolvedModel, userId, provider: "validation", status: "error", errorMessage: err, latencyMs: 0 });
      return new Response(JSON.stringify({ error: err }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  }

  const startedAt = Date.now();

  try {
    const resp = await withRetry(
      () => callGeminiDirect(body, resolvedModel, geminiKey, signal, isStream),
      { maxRetries, label: `gemini-direct[${feature}]` },
    );

    if (!skipLog) {
      if (resp.ok && !isStream) {
        const cloned = resp.clone();
        cloned.json()
          .then((data) => logUsage({ feature, model: resolvedModel, userId, provider: "gemini-direct", status: "success", latencyMs: Date.now() - startedAt, usage: data?.usage }))
          .catch(() => {});
      } else if (resp.ok && isStream) {
        logUsage({ feature, model: resolvedModel, userId, provider: "gemini-direct-stream", status: "success", latencyMs: Date.now() - startedAt }).catch(() => {});
      } else {
        const cloned = resp.clone();
        cloned.text()
          .then((t) => logUsage({ feature, model: resolvedModel, userId, provider: "gemini-direct", status: "error", errorMessage: `${resp.status}: ${t.slice(0, 200)}`, latencyMs: Date.now() - startedAt }))
          .catch(() => {});
      }
    }

    return resp;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[aiGateway][${feature}] Gemini call threw:`, msg);
    if (!skipLog) await logUsage({ feature, model: resolvedModel, userId, provider: "gemini-direct", status: "error", errorMessage: msg, latencyMs: Date.now() - startedAt });
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

// ─── Retry with exponential backoff + jitter ──────────────────
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
      await new Promise((r) => setTimeout(r, base + jitter));
    }
  }

  if (lastResp) return lastResp;
  throw lastErr ?? new Error("Retry loop exited without response");
}

// ─── Tool/function spec validation ────────────────────────────
function validateToolSpec(tools: any[]): { ok: true } | { ok: false; error: string } {
  if (!Array.isArray(tools)) return { ok: false, error: "tools must be an array" };
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    if (!t || typeof t !== "object") return { ok: false, error: `tools[${i}] is not an object` };
    if (t.type !== "function") return { ok: false, error: `tools[${i}].type must be "function"` };
    if (!t.function || typeof t.function !== "object") return { ok: false, error: `tools[${i}].function missing` };
    if (typeof t.function.name !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(t.function.name)) {
      return { ok: false, error: `tools[${i}].function.name invalid (must match /^[a-zA-Z0-9_-]{1,64}$/)` };
    }
    if (t.function.parameters && typeof t.function.parameters !== "object") {
      return { ok: false, error: `tools[${i}].function.parameters must be an object` };
    }
    if (t.function.parameters && t.function.parameters.type && t.function.parameters.type !== "object") {
      return { ok: false, error: `tools[${i}].function.parameters.type must be "object"` };
    }
  }
  return { ok: true };
}

// ─── Recursively normalize JSON-Schema → Gemini-compatible OpenAPI subset ─────
// Gemini's functionDeclarations only accept a strict OpenAPI 3.0 subset:
//  - `type` must be a single string (not an array like ["string","null"])
//  - No `additionalProperties`, `$schema`, `$id`, `$ref`, `definitions`
//  - No `oneOf` / `anyOf` / `allOf` / `not`
//  - No `const`, `examples`, `default` on some shapes
//  - `enum` only valid on string types
//  - Empty `properties: {}` with `type: object` is rejected — must omit properties
const STRIP_KEYS = new Set([
  "additionalProperties", "$schema", "$id", "$ref", "definitions",
  "patternProperties", "dependencies", "if", "then", "else", "not",
  "examples", "const", "readOnly", "writeOnly", "contentEncoding",
  "contentMediaType", "deprecated",
]);

function sanitizeSchema(schema: any): any {
  if (schema === null || schema === undefined) return schema;
  if (typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);

  const cleaned: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (STRIP_KEYS.has(k)) continue;

    // Collapse union types like ["string","null"] → "string" (drop null variant)
    if (k === "type" && Array.isArray(v)) {
      const nonNull = v.filter((t) => t !== "null");
      cleaned.type = nonNull[0] ?? "string";
      cleaned.nullable = v.includes("null") || v.length !== nonNull.length;
      continue;
    }

    // Flatten oneOf/anyOf/allOf — pick first variant (Gemini doesn't support them)
    if (k === "oneOf" || k === "anyOf" || k === "allOf") {
      if (Array.isArray(v) && v.length > 0) {
        const merged = sanitizeSchema(v[0]);
        if (merged && typeof merged === "object") {
          for (const [mk, mv] of Object.entries(merged)) {
            if (!(mk in cleaned)) cleaned[mk] = mv;
          }
        }
      }
      continue;
    }

    cleaned[k] = sanitizeSchema(v);
  }

  // Drop enum if present on non-string types (Gemini limitation)
  if (cleaned.enum && cleaned.type && cleaned.type !== "string") {
    delete cleaned.enum;
  }

  // Drop empty properties on object types
  if (cleaned.type === "object" && cleaned.properties && typeof cleaned.properties === "object" && Object.keys(cleaned.properties).length === 0) {
    delete cleaned.properties;
    delete cleaned.required;
  }

  return cleaned;
}

// ─── DB logging ───────────────────────────────────────────────
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

// ─── Direct Google Generative Language API call ───────────────
async function callGeminiDirect(
  body: ChatBody,
  modelId: string,
  apiKey: string,
  signal?: AbortSignal,
  stream = false,
): Promise<Response> {
  const systemMessages = body.messages.filter((m) => m.role === "system");
  const otherMessages = body.messages.filter((m) => m.role !== "system");

  const contents = otherMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const geminiBody: any = { contents };

  if (systemMessages.length > 0) {
    geminiBody.systemInstruction = {
      parts: [{ text: systemMessages.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n\n") }],
    };
  }

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    geminiBody.tools = [{
      functionDeclarations: body.tools
        .filter((t: any) => t?.type === "function" && t.function)
        .map((t: any) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: sanitizeSchema(t.function.parameters),
        })),
    }];
    if (body.tool_choice && typeof body.tool_choice === "object" && body.tool_choice.function?.name) {
      geminiBody.toolConfig = {
        functionCallingConfig: { mode: "ANY", allowedFunctionNames: [body.tool_choice.function.name] },
      };
    }
  }

  const generationConfig: any = {};
  if (typeof body.max_tokens === "number") generationConfig.maxOutputTokens = body.max_tokens;
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  // Only request JSON MIME when no tools are present (Gemini rejects mixing tools + json mime).
  if (body.response_format?.type === "json_object" && !geminiBody.tools) {
    generationConfig.responseMimeType = "application/json";
  }
  if (Object.keys(generationConfig).length > 0) geminiBody.generationConfig = generationConfig;

  // ─── Streaming: use streamGenerateContent → bridge to OpenAI SSE ──
  if (stream) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
      signal,
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(text, { status: upstream.status, headers: { "Content-Type": "application/json" } });
    }

    const sse = bridgeGeminiStreamToOpenAI(upstream.body, body.model);
    return new Response(sse, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // ─── Non-streaming ─────────────────────────────────────────
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { "Content-Type": "application/json" } });
  }

  const data = await resp.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const textPart = parts.find((p: any) => typeof p.text === "string")?.text ?? "";
  const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any, i: number) => ({
    id: `call_${i}`,
    type: "function",
    function: {
      name: p.functionCall.name,
      arguments: typeof p.functionCall.args === "string" ? p.functionCall.args : JSON.stringify(p.functionCall.args ?? {}),
    },
  }));

  const openAIResp = {
    id: data.responseId ?? `gemini-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: textPart,
        ...(functionCalls.length > 0 ? { tool_calls: functionCalls } : {}),
      },
      finish_reason: functionCalls.length > 0 ? "tool_calls" : (candidate?.finishReason?.toLowerCase() ?? "stop"),
    }],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    },
  };

  return new Response(JSON.stringify(openAIResp), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Bridge Gemini SSE → OpenAI SSE ───────────────────────────
function bridgeGeminiStreamToOpenAI(upstream: ReadableStream<Uint8Array>, modelName: string): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, newlineIdx).trim();
            buf = buf.slice(newlineIdx + 1);
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              const chunk = JSON.parse(json);
              const text = chunk.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === "string")?.text;
              if (text) {
                const openaiChunk = {
                  id, object: "chat.completion.chunk", created, model: modelName,
                  choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
              const finishReason = chunk.candidates?.[0]?.finishReason;
              if (finishReason) {
                const finalChunk = {
                  id, object: "chat.completion.chunk", created, model: modelName,
                  choices: [{ index: 0, delta: {}, finish_reason: finishReason.toLowerCase() }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
              }
            } catch (_) { /* skip malformed */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("[aiGateway:stream-bridge]", e);
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}
