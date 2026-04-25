import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fields we never overwrite on the live row when applying a user change-request
const PROTECTED_FIELDS = new Set([
  "id", "created_at", "slug", "submitted_by_user_id", "source",
  "ranking", "featured", "tier", "college_category",
  "meta_title", "meta_description", "keywords", "h1_tag", "primary_keyword",
  "funnel_stage", "cluster_id", "content_score", "content_hash", "last_seo_refresh",
]);

const sanitisePayload = (payload: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (PROTECTED_FIELDS.has(k)) continue;
    // Skip nested arrays handled separately
    if (k === "courses_list" || k === "faculty_list" || k === "results_list") continue;
    out[k] = v;
  }
  out.last_updated_by = "user-verified";
  out.updated_at = new Date().toISOString();
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Verify admin from JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { change_request_id, action, admin_notes } = body as {
      change_request_id: string;
      action: "approve" | "reject";
      admin_notes?: string;
    };

    if (!change_request_id || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: cr, error: crErr } = await admin
      .from("listing_change_requests")
      .select("*")
      .eq("id", change_request_id)
      .maybeSingle();

    if (crErr || !cr) {
      return new Response(JSON.stringify({ error: "Change request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (cr.status !== "pending") {
      return new Response(JSON.stringify({ error: `Already ${cr.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reject") {
      await admin.from("listing_change_requests").update({
        status: "rejected",
        admin_notes: admin_notes ?? null,
        reviewed_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", change_request_id);
      return new Response(JSON.stringify({ ok: true, action: "rejected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // APPROVE → merge into live row
    const targetTable = cr.target_table as "institutes" | "colleges";
    if (!["institutes", "colleges"].includes(targetTable)) {
      return new Response(JSON.stringify({ error: "Bad target table" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const merged = sanitisePayload(cr.new_payload || {});
    const { error: updErr } = await admin
      .from(targetTable)
      .update(merged)
      .eq("id", cr.target_record_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle nested arrays if present
    const newPayload = cr.new_payload || {};

    if (targetTable === "institutes") {
      // Replace courses
      if (Array.isArray(newPayload.courses_list)) {
        await admin.from("courses").delete().eq("institute_id", cr.target_record_id);
        if (newPayload.courses_list.length > 0) {
          const rows = newPayload.courses_list.map((c: any) => ({
            ...c, institute_id: cr.target_record_id, id: undefined,
          }));
          await admin.from("courses").insert(rows);
        }
      }
      if (Array.isArray(newPayload.faculty_list)) {
        await admin.from("faculty").delete().eq("institute_id", cr.target_record_id);
        if (newPayload.faculty_list.length > 0) {
          const rows = newPayload.faculty_list.map((f: any) => ({
            ...f, institute_id: cr.target_record_id, id: undefined,
          }));
          await admin.from("faculty").insert(rows);
        }
      }
      if (Array.isArray(newPayload.results_list)) {
        await admin.from("institute_results").delete().eq("institute_id", cr.target_record_id);
        if (newPayload.results_list.length > 0) {
          const rows = newPayload.results_list.map((r: any) => ({
            ...r, institute_id: cr.target_record_id, id: undefined,
          }));
          await admin.from("institute_results").insert(rows);
        }
      }
    }

    await admin.from("listing_change_requests").update({
      status: "approved",
      admin_notes: admin_notes ?? null,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", change_request_id);

    return new Response(JSON.stringify({ ok: true, action: "approved" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
