import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getOpenAiSlotKeys, fingerprint } from "../_shared/getCredential.ts";

type SlotStatus = {
  secret_name: string;
  label: string;
  configured: boolean;
  valid: boolean | null;
  status: "ready" | "missing" | "invalid" | "quota_blocked" | "unavailable";
  message: string;
  fingerprint?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function inspectSlot(slot: { secret_name: string; label: string; key: string }): Promise<SlotStatus> {
  const base = { secret_name: slot.secret_name, label: slot.label };
  if (!slot.key) {
    return { ...base, configured: false, valid: null, status: "missing", message: "Secret is not configured", fingerprint: "missing" };
  }
  const fp = await fingerprint(slot.key);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${slot.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Reply OK" }], max_tokens: 2 }),
    });
    if (response.ok) {
      return { ...base, configured: true, valid: true, status: "ready", message: "Live generation succeeded with gpt-4o-mini", fingerprint: fp };
    }

    const body = await response.json().catch(() => ({}));
    const errorCode = String(body?.error?.code || "");
    const errorMessage = String(body?.error?.message || `OpenAI returned HTTP ${response.status}`);
    const quotaBlocked = response.status === 429 || errorCode === "insufficient_quota";
    return {
      ...base,
      configured: true,
      valid: quotaBlocked ? true : false,
      status: quotaBlocked ? "quota_blocked" : "invalid",
      message: quotaBlocked ? "Key is valid, but this OpenAI account has no available quota" : errorMessage.slice(0, 180),
      fingerprint: fp,
    };
  } catch (error) {
    return {
      ...base,
      configured: true,
      valid: null,
      status: "unavailable",
      message: error instanceof Error ? error.message : "Could not reach OpenAI",
      fingerprint: fp,
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

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [slots, monthUsage, allUsage] = await Promise.all([
    Promise.all(getOpenAiSlotKeys().map(inspectSlot)),
    admin.from("ai_usage_logs").select("estimated_cost").or("provider.ilike.openai%,model.ilike.gpt%").gte("created_at", monthStart),
    admin.from("ai_usage_logs").select("estimated_cost").or("provider.ilike.openai%,model.ilike.gpt%"),
  ]);

  const sumCost = (rows: Array<{ estimated_cost: number | null }> | null) =>
    (rows || []).reduce((sum, row) => sum + Number(row.estimated_cost || 0), 0);

  return json({
    slots,
    account: slots.find((s) => s.status === "ready") ?? slots[0],
    tracked_spend: {
      current_month_usd: sumCost(monthUsage.data),
      all_time_usd: sumCost(allUsage.data),
    },
    balance: {
      available: false,
      message:
        "OpenAI does not expose prepaid credit remaining through standard API keys. Tracked spend is shown from MBA Compass generation logs; confirm the exact balance in OpenAI billing.",
    },
    checked_at: new Date().toISOString(),
  });
});
