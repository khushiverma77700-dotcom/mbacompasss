import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory IP rate-limit (best-effort; resets per cold start).
// Limits anonymous abuse / user-enumeration scraping.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10; // 10 checks / IP / minute
const ipHits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = ipHits.get(ip);
  if (!cur || now - cur.windowStart > RATE_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";
    const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    // Strict input validation: reject anything that isn't a well-formed candidate.
    const phone = /^\d{10}$/.test(phoneRaw) ? phoneRaw : "";
    const email =
      emailRaw.length > 0 && emailRaw.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
        ? emailRaw
        : "";

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: "Provide a valid email or 10-digit phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const result: { phoneExists: boolean; emailExists: boolean } = {
      phoneExists: false,
      emailExists: false,
    };

    if (phone) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone);
      result.phoneExists = (count ?? 0) > 0;
    }

    if (email) {
      // Targeted lookup — avoids scanning the full user list each call.
      const { data } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        // @ts-ignore — filter is supported by the GoTrue admin API
        filter: `email.eq.${email}`,
      });
      result.emailExists = !!data?.users?.some((u) => u.email?.toLowerCase() === email);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-duplicate error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
