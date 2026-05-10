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
    const msg91AuthKey = (await getCredential("MSG91_AUTH_KEY")) || Deno.env.get("MSG91_AUTH_KEY");
    const msg91TemplateId = (await getCredential("MSG91_TEMPLATE_ID")) || Deno.env.get("MSG91_TEMPLATE_ID");

    if (!msg91AuthKey) throw new Error("MSG91_AUTH_KEY is not configured");
    if (!msg91TemplateId) throw new Error("MSG91_TEMPLATE_ID is not configured");

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

    // Fire-and-forget SMS via MSG91 Flow API; OTP is already persisted.
    const msg91Url = "https://control.msg91.com/api/v5/flow/";
    const msg91Body = {
      template_id: msg91TemplateId,
      short_url: "0",
      recipients: [
        {
          mobiles: `91${phone}`,
          otp,
          OTP: otp,
          var: otp,
          var1: otp,
        },
      ],
    };

    const smsTask = fetch(msg91Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        authkey: msg91AuthKey,
      },
      body: JSON.stringify(msg91Body),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.type === "error") {
          console.error("MSG91 error:", JSON.stringify(j));
        } else {
          console.log("OTP sent via MSG91 to", phone, JSON.stringify(j));
        }
      })
      .catch((e) => console.error("MSG91 fetch failed:", e));

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
