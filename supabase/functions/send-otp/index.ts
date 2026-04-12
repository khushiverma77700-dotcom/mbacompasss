import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");
    const msg91TemplateId = Deno.env.get("MSG91_TEMPLATE_ID");

    if (!msg91AuthKey) {
      throw new Error("MSG91_AUTH_KEY is not configured");
    }
    if (!msg91TemplateId) {
      throw new Error("MSG91_TEMPLATE_ID is not configured");
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

    // Send OTP via MSG91 Send OTP API
    const smsResponse = await fetch(
      `https://control.msg91.com/api/v5/otp?template_id=${msg91TemplateId}&mobile=91${phone}&otp=${otp}`,
      {
        method: "POST",
        headers: {
          authkey: msg91AuthKey,
          "Content-Type": "application/json",
        },
      }
    );

    const smsResult = await smsResponse.json();

    if (!smsResponse.ok || smsResult.type === "error") {
      console.error("MSG91 error:", JSON.stringify(smsResult));
      throw new Error(`SMS send failed: ${smsResult.message || "Unknown error"}`);
    }

    console.log("OTP sent successfully via MSG91 to", phone);

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
