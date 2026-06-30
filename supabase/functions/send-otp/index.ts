import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone || !/^\d{10}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Valid 10-digit phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hspUsername = Deno.env.get("HSPSMS_USERNAME");
    const hspApiKey = Deno.env.get("HSPSMS_API_KEY");
    const hspSender = Deno.env.get("HSPSMS_SENDER_ID");
    const hspTemplate = Deno.env.get("HSPSMS_OTP_TEMPLATE");

    if (!hspUsername || !hspApiKey || !hspSender || !hspTemplate) {
      throw new Error("HSPSMS credentials are not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit: max 3 OTPs per phone in last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try after 10 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Hash OTP before storage so even privileged DB reads cannot recover the code
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${otp}`));
    const otpHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // Store hashed OTP in database (column name retained; value is now a SHA-256 hex digest)
    const { error: insertError } = await supabase.from("phone_otps").insert({
      phone,
      otp_code: otpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("DB insert error:", insertError);
      throw new Error("Failed to store OTP");
    }

    // Send SMS via 2Factor.in (no DLT / no template required).
    // Endpoint: /SMS/{phone}/{otp}/AUTOGEN  → forces transactional SMS only (no voice call fallback).
    const twoFactorUrl = `https://2factor.in/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${phone}/${otp}/AUTOGEN`;

    // Send SMS via HSP SMS (DLT transactional). Template must include an OTP placeholder
    // such as {OTP} or {#var#} — we substitute the generated code into it.
    const message = hspTemplate
      .replace(/\{#var#\}/gi, otp)
      .replace(/\{otp\}/gi, otp)
      .replace(/\{\{otp\}\}/gi, otp);

    const hspUrl = `https://sms.hspsms.com/sendSMS?username=${encodeURIComponent(hspUsername)}` +
      `&message=${encodeURIComponent(message)}` +
      `&sendername=${encodeURIComponent(hspSender)}` +
      `&smstype=TRANS` +
      `&numbers=${encodeURIComponent(phone)}` +
      `&apikey=${encodeURIComponent(hspApiKey)}`;

    const smsTask = fetch(hspUrl, { method: "GET" })
      .then(async (r) => {
        const text = await r.text().catch(() => "");
        if (!r.ok) {
          console.error("HSPSMS error:", r.status, text);
        } else {
          console.log("OTP sent via HSPSMS to", phone, text);
        }
      })
      .catch((e) => console.error("HSPSMS fetch failed:", e));

    // @ts-ignore EdgeRuntime is provided by Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(smsTask);
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
