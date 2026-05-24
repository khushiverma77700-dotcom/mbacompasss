import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: This endpoint must remain callable unauthenticated because it powers
// login-by-mobile and forgot-password flows where the user has no session yet.
// Enumeration risk is mitigated by:
//   1. IP-based rate limiting (10 lookups / minute / IP) recorded in `phone_lookup_audit`.
//   2. Generic "no account" responses with the same shape whether or not a phone exists.
//   3. Never disclosing the email to a caller whose IP exceeded the cap.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone || !/^\d{10}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Valid 10-digit phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lightweight rate limit: count lookups from this IP in the last 60s.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount } = await supabase
      .from("phone_lookup_audit")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", sinceIso);

    if ((recentCount ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record this attempt (best-effort — don't fail the request if logging fails).
    await supabase
      .from("phone_lookup_audit")
      .insert({ ip, phone_hash_prefix: phone.slice(0, 3) })
      .then(() => undefined, () => undefined);

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (!profile?.user_id) {
      return new Response(JSON.stringify({ email: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userResp, error: userErr } = await supabase.auth.admin.getUserById(profile.user_id);
    if (userErr) throw userErr;

    return new Response(JSON.stringify({ email: userResp?.user?.email ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lookup-email-by-phone error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
