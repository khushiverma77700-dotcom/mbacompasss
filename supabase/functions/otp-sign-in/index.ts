import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Passwordless mobile-OTP sign-in. Verifies the OTP against phone_otps, then
// mints a session for the (latest) account associated with that phone number.
// Returns { noAccount: true } when no profile is linked to the phone, so the
// client can show the "purchase a course" message without leaking enumeration.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, otp } = await req.json();
    if (!phone || !/^\d{10}$/.test(phone)) {
      return json({ error: "Valid 10-digit phone required" }, 400);
    }
    if (!otp || !/^\d{6}$/.test(otp)) {
      return json({ error: "Valid 6-digit OTP required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch latest unverified OTP for this phone.
    const { data: otpRecord } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) return json({ error: "OTP expired or not found. Please request a new one." }, 400);
    if (otpRecord.attempts >= 5) return json({ error: "Too many attempts. Request a new OTP." }, 429);

    await supabase.from("phone_otps").update({ attempts: otpRecord.attempts + 1 }).eq("id", otpRecord.id);

    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${otp}`));
    const otpHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (otpRecord.otp_code !== otpHash) {
      return json({ error: "Invalid OTP. Please try again." }, 400);
    }
    await supabase.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);

    // Resolve the most recent profile (with a usable email) for this phone.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    let email: string | null = null;
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        const { data: u } = await supabase.auth.admin.getUserById(p.user_id);
        if (u?.user?.email) { email = u.user.email; break; }
      }
    }
    if (!email) return json({ noAccount: true }, 200);

    // Mint a magic-link, parse the access/refresh tokens from the redirect.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error(linkErr?.message || "Failed to create sign-in link");
    }

    // Exchange the verification token for a session via verifyOtp.
    const { data: verify, error: verifyErr } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: linkData.properties.hashed_token,
    } as any);
    if (verifyErr || !verify?.session) {
      throw new Error(verifyErr?.message || "Failed to mint session");
    }

    return json({
      access_token: verify.session.access_token,
      refresh_token: verify.session.refresh_token,
      user_id: verify.user?.id,
    });
  } catch (error) {
    console.error("otp-sign-in error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
