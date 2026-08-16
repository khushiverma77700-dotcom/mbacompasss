// Temporary diagnostic: verifies the two allowed OpenAI keys respond.
// Requires the AI_SELFTEST_TOKEN header. Never returns key material.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getOpenAiSlotKeys, fingerprint } from "../_shared/getCredential.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const expected = Deno.env.get("AI_SELFTEST_TOKEN") || "";
  if (!expected || req.headers.get("x-selftest-token") !== expected) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const results = [];
  for (const slot of getOpenAiSlotKeys()) {
    if (!slot.key) {
      results.push({ label: slot.label, secret: slot.secret_name, configured: false });
      continue;
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${slot.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "ok" }], max_tokens: 2 }),
    });
    const body = await res.json().catch(() => ({}));
    results.push({
      label: slot.label,
      secret: slot.secret_name,
      configured: true,
      fingerprint: await fingerprint(slot.key),
      http_status: res.status,
      ok: res.ok,
      error_code: body?.error?.code ?? null,
      error_message: typeof body?.error?.message === "string" ? body.error.message.slice(0, 160) : null,
    });
  }

  return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
