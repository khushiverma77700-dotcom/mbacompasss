// One-shot seeder: copies existing Supabase Edge Function env secrets into the
// api_credentials table so the Admin → API Keys UI shows real values.
// Only fills rows that are currently empty. Never overwrites an existing DB value.
// Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map of secret name -> { category, description }
const SEED_KEYS: Record<string, { category: string; description: string }> = {
  RAZORPAY_KEY_ID: { category: "payments", description: "Razorpay public Key ID for creating orders" },
  RAZORPAY_KEY_SECRET: { category: "payments", description: "Razorpay secret used to verify payments" },
  RAZORPAY_WEBHOOK_SECRET: { category: "payments", description: "Razorpay webhook signing secret" },

  OPENAI_API_KEY: { category: "ai", description: "OpenAI API key (GPT models)" },
  GEMINI_API_KEY: { category: "ai", description: "Google Gemini API key" },
  LOVABLE_API_KEY: { category: "ai", description: "Lovable AI Gateway key" },

  MSG91_AUTH_KEY: { category: "sms", description: "MSG91 auth key for OTP delivery" },
  MSG91_TEMPLATE_ID: { category: "sms", description: "MSG91 OTP template ID" },
  FAST2SMS_API_KEY: { category: "sms", description: "Fast2SMS API key (fallback OTP provider)" },
  TWILIO_API_KEY: { category: "sms", description: "Twilio API key" },
  TWILIO_FROM_NUMBER: { category: "sms", description: "Twilio sender number" },

  GOOGLE_PSI_API_KEY: { category: "seo", description: "Google PageSpeed Insights API key" },
  GOOGLE_INDEXING_CLIENT_EMAIL: { category: "seo", description: "Google Indexing service account email" },
  GOOGLE_INDEXING_PRIVATE_KEY: { category: "seo", description: "Google Indexing service account private key" },
  GOOGLE_INDEXING_SERVICE_ACCOUNT: { category: "seo", description: "Full Google Indexing service account JSON" },

  FIRECRAWL_API_KEY: { category: "scraping", description: "Firecrawl API key for web scraping" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await userClient
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

    const results: Array<{ key: string; status: string }> = [];

    for (const [name, meta] of Object.entries(SEED_KEYS)) {
      const envValue = Deno.env.get(name) || "";
      if (!envValue) {
        results.push({ key: name, status: "skipped (no env value)" });
        continue;
      }

      const { data: existing } = await sb
        .from("api_credentials").select("id, key_value").eq("key_name", name).maybeSingle();

      if (existing && existing.key_value && (existing.key_value as string).length > 0) {
        results.push({ key: name, status: "skipped (already set)" });
        continue;
      }

      if (existing) {
        const { error } = await sb.from("api_credentials").update({
          key_value: envValue,
          category: meta.category,
          description: meta.description,
          is_active: true,
        }).eq("id", existing.id);
        if (error) results.push({ key: name, status: `error: ${error.message}` });
        else results.push({ key: name, status: "filled from env" });
      } else {
        const { error } = await sb.from("api_credentials").insert({
          key_name: name,
          key_value: envValue,
          category: meta.category,
          description: meta.description,
          is_active: true,
        });
        if (error) results.push({ key: name, status: `error: ${error.message}` });
        else results.push({ key: name, status: "created from env" });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
