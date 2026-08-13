import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type SlotStatus = {
  slot: 1 | 2;
  name: string;
  secret_name: string;
  configured: boolean;
  valid: boolean | null;
  status: "ready" | "missing" | "invalid" | "quota_blocked" | "unavailable";
  message: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function inspectKey(slot: 1 | 2, name: string, secretName: string): Promise<SlotStatus> {
  const key = Deno.env.get(secretName) || "";
  if (!key) {
    return { slot, name, secret_name: secretName, configured: false, valid: null, status: "missing", message: "Secret is not configured" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models/gpt-4o-mini", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (response.ok) {
      return { slot, name, secret_name: secretName, configured: true, valid: true, status: "ready", message: "Key is valid and can access gpt-4o-mini" };
    }

    const body = await response.json().catch(() => ({}));
    const errorCode = String(body?.error?.code || "");
    const errorMessage = String(body?.error?.message || `OpenAI returned HTTP ${response.status}`);
    const quotaBlocked = response.status === 429 || errorCode === "insufficient_quota";
    return {
      slot,
      name,
      secret_name: secretName,
      configured: true,
      valid: quotaBlocked ? true : false,
      status: quotaBlocked ? "quota_blocked" : "invalid",
      message: quotaBlocked ? "Key is valid, but the OpenAI account has no available quota" : errorMessage.slice(0, 180),
    };
  } catch (error) {
    return {
      slot,
      name,
      secret_name: secretName,
      configured: true,
      valid: null,
      status: "unavailable",
      message: error instanceof Error ? error.message : "Could not reach OpenAI",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Backend configuration is incomplete" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return json({ error: "Authentication required" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Admin access required" }, 403);

  const [suyash, vaibhav, monthUsage, allUsage, activeSlotRow] = await Promise.all([
    inspectKey(1, "Suyash", "OPENAI_API_KEY"),
    inspectKey(2, "Vaibhav", "OPENAI_API_KEY_2"),
    admin.from("ai_usage_logs").select("estimated_cost").eq("provider", "openai").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from("ai_usage_logs").select("estimated_cost").eq("provider", "openai"),
    admin.from("site_settings").select("value").eq("key", "openai_active_slot").maybeSingle(),
  ]);

  const sumCost = (rows: Array<{ estimated_cost: number | null }> | null) =>
    (rows || []).reduce((sum, row) => sum + Number(row.estimated_cost || 0), 0);
  const selected = (activeSlotRow.data?.value as { slot?: number | string } | null)?.slot;

  return json({
    slots: [suyash, vaibhav],
    active_slot: selected === 2 || selected === "2" ? 2 : 1,
    tracked_spend: {
      current_month_usd: sumCost(monthUsage.data),
      all_time_usd: sumCost(allUsage.data),
    },
    balance: {
      available: false,
      message: "OpenAI does not expose prepaid credit remaining through standard API keys. Tracked spend is shown from MBA Compass generation logs; confirm the exact balance in OpenAI billing.",
    },
    checked_at: new Date().toISOString(),
  });
});