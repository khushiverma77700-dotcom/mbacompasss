// v3 - HSPSMS only with verbose delivery logging. Rev 2026-07-12b.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderResult = { ok: boolean; provider: string; detail: string; msgid?: string };

function mask(s: string | null | undefined, keep = 4): string {
  if (!s) return "(empty)";
  if (s.length <= keep) return "*".repeat(s.length);
  return `${s.slice(0, keep)}${"*".repeat(Math.max(0, s.length - keep))}`;
}

async function trySendHspsms(phone: string, otp: string, reqId: string): Promise<ProviderResult | null> {
  const t0 = Date.now();
  const username = await getCredential("HSPSMS_USERNAME", { required: false });
  const apiKey = await getCredential("HSPSMS_API_KEY", { required: false });
  const sender = await getCredential("HSPSMS_SENDER_ID", { required: false });
  const template = await getCredential("HSPSMS_OTP_TEMPLATE", { required: false });

  console.log(`[send-otp][${reqId}] HSPSMS creds check`, {
    username_present: !!username,
    username_preview: mask(username),
    apiKey_present: !!apiKey,
    apiKey_preview: mask(apiKey, 6),
    sender_present: !!sender,
    sender: sender || "(empty)",
    template_present: !!template,
    template_len: template?.length ?? 0,
    template_preview: template ? template.slice(0, 80) : "(empty)",
  });

  if (!username || !apiKey || !sender || !template) {
    console.error(`[send-otp][${reqId}] HSPSMS credentials incomplete — cannot send`);
    return null;
  }

  const message = template
    .replace(/\{#var#\}/gi, otp)
    .replace(/\{otp\}/gi, otp)
    .replace(/\{\{otp\}\}/gi, otp);
  const url = `https://sms.hspsms.com/sendSMS?username=${encodeURIComponent(username)}` +
    `&message=${encodeURIComponent(message)}` +
    `&sendername=${encodeURIComponent(sender)}` +
    `&smstype=TRANS` +
    `&numbers=${encodeURIComponent(phone)}` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  const safeUrl = url.replace(encodeURIComponent(apiKey), "***").replace(encodeURIComponent(username), mask(username));
  console.log(`[send-otp][${reqId}] HSPSMS request`, {
    phone, sender, message_preview: message.slice(0, 120), url: safeUrl,
  });

  try {
    const r = await fetch(url);
    const text = await r.text().catch(() => "");
    const elapsedMs = Date.now() - t0;

    // Parse msgid / responseCode when present
    let msgid: string | undefined;
    let responseCode: string | undefined;
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j)) {
        for (const item of j) {
          if (item?.msgid) msgid = String(item.msgid);
          if (item?.responseCode) responseCode = String(item.responseCode);
        }
      } else if (j && typeof j === "object") {
        msgid = j.msgid ? String(j.msgid) : undefined;
        responseCode = j.responseCode ? String(j.responseCode) : undefined;
      }
    } catch (_) { /* non-JSON response */ }

    const badMarkers = /error|fail|invalid|insufficient|blocked|denied|reject/i;
    const goodMarkers = /success|submitted/i;
    const ok = r.ok && (goodMarkers.test(text) || !!msgid) && !badMarkers.test(text.replace(/success[^"]*/i, ""));

    console.log(`[send-otp][${reqId}] HSPSMS response`, {
      http_status: r.status, elapsed_ms: elapsedMs, ok, msgid, responseCode,
      raw_body: text.slice(0, 500),
    });

    return { ok, provider: "hspsms", detail: `${r.status}: ${text.slice(0, 300)}`, msgid };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[send-otp][${reqId}] HSPSMS fetch error`, { detail, elapsed_ms: Date.now() - t0 });
    return { ok: false, provider: "hspsms", detail };
  }
}


async function trySendMsg91(phone: string, otp: string): Promise<ProviderResult | null> {
  const authKey = await getCredential("MSG91_AUTH_KEY", { required: false });
  const templateId = await getCredential("MSG91_TEMPLATE_ID", { required: false });
  if (!authKey || !templateId) return null;
  // MSG91 OTP API. Phone must be with country code (default IN: 91).
  const mobile = phone.length === 10 ? `91${phone}` : phone;
  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(templateId)}&mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(otp)}&otp_expiry=5`;
  try {
    const r = await fetch(url, { method: "POST", headers: { authkey: authKey, "Content-Type": "application/json" } });
    const text = await r.text().catch(() => "");
    const ok = r.ok && /success/i.test(text);
    return { ok, provider: "msg91", detail: `${r.status}: ${text.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, provider: "msg91", detail: e instanceof Error ? e.message : String(e) };
  }
}

async function trySendFast2sms(phone: string, otp: string): Promise<ProviderResult | null> {
  const apiKey = await getCredential("FAST2SMS_API_KEY", { required: false });
  if (!apiKey) return null;
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&variables_values=${encodeURIComponent(otp)}&route=otp&numbers=${encodeURIComponent(phone)}`;
  try {
    const r = await fetch(url);
    const text = await r.text().catch(() => "");
    const ok = r.ok && /"return":\s*true/i.test(text);
    return { ok, provider: "fast2sms", detail: `${r.status}: ${text.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, provider: "fast2sms", detail: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone || !/^\d{10}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Valid 10-digit phone number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", tenMinAgo);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many OTP requests. Please try after 10 minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${otp}`));
    const otpHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const { error: insertError } = await supabase.from("phone_otps").insert({
      phone,
      otp_code: otpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (insertError) {
      console.error("DB insert error:", insertError);
      throw new Error("Failed to store OTP");
    }

    // Try providers in order; return success only when one accepts the send.
    const attempts: ProviderResult[] = [];
    // HSPSMS only — per admin preference.
    for (const fn of [trySendHspsms]) {
      const res = await fn(phone, otp);
      if (!res) continue; // provider not configured
      attempts.push(res);
      console.log(`[send-otp] provider=${res.provider} ok=${res.ok} detail=${res.detail}`);
      if (res.ok) {
        return new Response(JSON.stringify({ success: true, provider: res.provider }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (attempts.length === 0) {
      console.error("[send-otp] No SMS provider configured");
      return new Response(JSON.stringify({ error: "SMS provider not configured. Contact support." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("[send-otp] All providers failed:", attempts);
    return new Response(JSON.stringify({
      error: "Unable to send OTP right now. Please try again in a minute.",
      attempts: attempts.map((a) => ({ provider: a.provider, ok: a.ok })),
    }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
