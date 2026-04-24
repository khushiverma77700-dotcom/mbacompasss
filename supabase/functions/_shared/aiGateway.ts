// Shared AI Gateway helper.
// Routes google/gemini-* model calls to Google's direct Generative Language API
// when GEMINI_API_KEY is configured (cheaper, user-owned billing).
// Falls back to Lovable AI Gateway (LOVABLE_API_KEY) for everything else,
// or when GEMINI_API_KEY is missing / Google call fails.

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

/**
 * Drop-in replacement for `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)`.
 * Same OpenAI-style request body, same OpenAI-style response shape.
 * Auto-routes Gemini models to user's direct key when available.
 */
export async function callAIGateway(body: ChatBody, init?: { signal?: AbortSignal }): Promise<Response> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const isGemini = typeof body.model === "string" && body.model.startsWith("google/gemini");

  // Try direct Gemini first if user supplied their own key & it's a Gemini model & no streaming.
  if (isGemini && geminiKey && !body.stream) {
    try {
      const direct = await callGeminiDirect(body, geminiKey, init?.signal);
      if (direct.ok) return direct;
      console.warn(`[aiGateway] Direct Gemini failed (${direct.status}), falling back to Lovable Gateway`);
    } catch (e) {
      console.warn("[aiGateway] Direct Gemini threw, falling back:", e instanceof Error ? e.message : e);
    }
  }

  // Fallback / default: Lovable AI Gateway
  if (!lovableKey) {
    return new Response(JSON.stringify({ error: "No AI provider key configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: init?.signal,
  });
}

// ─── Direct Google Generative Language API call ──────────────────
async function callGeminiDirect(body: ChatBody, apiKey: string, signal?: AbortSignal): Promise<Response> {
  // Strip "google/" prefix → e.g. "google/gemini-2.5-flash" → "gemini-2.5-flash"
  const modelId = body.model.replace(/^google\//, "");

  // Convert OpenAI-style messages → Gemini contents
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

  // Tool calling support — convert OpenAI tool spec → Gemini functionDeclarations
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    geminiBody.tools = [
      {
        functionDeclarations: body.tools
          .filter((t: any) => t?.type === "function" && t.function)
          .map((t: any) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
      },
    ];
    if (body.tool_choice && typeof body.tool_choice === "object" && body.tool_choice.function?.name) {
      geminiBody.toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [body.tool_choice.function.name],
        },
      };
    }
  }

  const generationConfig: any = {};
  if (typeof body.max_tokens === "number") generationConfig.maxOutputTokens = body.max_tokens;
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  if (body.response_format?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }
  if (Object.keys(generationConfig).length > 0) geminiBody.generationConfig = generationConfig;

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

  // Convert Gemini response → OpenAI-compatible shape
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
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textPart,
          ...(functionCalls.length > 0 ? { tool_calls: functionCalls } : {}),
        },
        finish_reason: functionCalls.length > 0 ? "tool_calls" : (candidate?.finishReason?.toLowerCase() ?? "stop"),
      },
    ],
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
