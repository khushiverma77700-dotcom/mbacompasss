import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Action = "reset_password" | "block" | "unblock" | "delete" | "get_emails";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing auth token" });

  // Verify caller and admin role
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Invalid token" });
  const callerId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json(403, { error: "Admin only" });

  let body: { action?: Action; user_id?: string; new_password?: string; user_ids?: string[] };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const { action, user_id } = body;
  if (!action) return json(400, { error: "action required" });

  // Bulk email lookup — no per-user_id required
  if (action === "get_emails") {
    const ids = (body.user_ids ?? []).filter(Boolean);
    if (ids.length === 0) return json(200, { emails: {} });
    const emails: Record<string, string> = {};
    // Page through users; admin.listUsers returns paginated results.
    let page = 1;
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      data.users.forEach((u) => { if (ids.includes(u.id) && u.email) emails[u.id] = u.email; });
      if (!data.users.length || data.users.length < 1000) break;
      page += 1;
    }
    return json(200, { emails });
  }

  if (!user_id) return json(400, { error: "user_id required" });
  if (user_id === callerId) return json(400, { error: "You cannot perform this action on your own account." });

  try {
    if (action === "reset_password") {
      const newPassword =
        body.new_password && body.new_password.length >= 8
          ? body.new_password
          : Array.from(crypto.getRandomValues(new Uint8Array(9)))
              .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[b % 54])
              .join("");
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: newPassword });
      if (error) throw error;
      return json(200, { ok: true, new_password: newPassword });
    }

    if (action === "block") {
      // ban for 100 years
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "unblock") {
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "Action failed" });
  }
});
