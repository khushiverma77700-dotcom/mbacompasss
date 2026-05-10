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
    const twoFactorKey = (await getCredential("TWOFACTOR_API_KEY")) || Deno.env.get("TWOFACTOR_API_KEY");

    if (!twoFactorKey) throw new Error("TWOFACTOR_API_KEY is not configured");

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

    // Store OTP in database
    const { error: insertError } = await supabase.from("phone_otps").insert({
      phone,
      otp_code: otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("DB insert error:", insertError);
      throw new Error("Failed to store OTP");
    }

    // Send SMS via 2Factor.in (no DLT / no template required).
    // Endpoint: /SMS/{phone}/{otp}  → uses 2Factor's pre-approved OTP template.
    const twoFactorUrl = `https://2factor.in/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${phone}/${otp}`;

    const smsTask = fetch(twoFactorUrl, { method: "GET" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.Status !== "Success") {
          console.error("2Factor error:", JSON.stringify(j));
        } else {
          console.log("OTP sent via 2Factor to", phone, JSON.stringify(j));
        }
      })
      .catch((e) => console.error("2Factor fetch failed:", e));

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
