// Apply Content Refresh — applies an approved (or per-field selected) refresh
// to the live entity table and marks the refresh row as approved+published.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TABLE: Record<string, string> = {
  article: "articles",
  college: "colleges",
  college_section: "college_sections",
  institute: "institutes",
  course: "courses",
};

interface Body {
  refresh_id: string;
  action: "approve" | "reject";
  // Optional: only apply these field names (per-field approval). If absent, apply ALL changed fields.
  selected_fields?: string[];
  reviewed_by?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.refresh_id || !body?.action) {
      return new Response(JSON.stringify({ error: "refresh_id and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: refresh, error: fetchErr } = await supabase
      .from("content_refreshes")
      .select("*")
      .eq("id", body.refresh_id)
      .maybeSingle();
    if (fetchErr || !refresh) throw new Error(fetchErr?.message || "Refresh not found");
    if (refresh.status !== "pending") throw new Error(`Refresh is ${refresh.status}, cannot ${body.action}`);

    if (body.action === "reject") {
      await supabase
        .from("content_refreshes")
        .update({
          status: "rejected",
          reviewed_by: body.reviewed_by || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", body.refresh_id);
      return new Response(JSON.stringify({ success: true, status: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Approve & publish
    const table = TABLE[refresh.entity_type];
    if (!table) throw new Error("Invalid entity_type");

    const proposed = (refresh.proposed_snapshot || {}) as Record<string, unknown>;
    const diff = (refresh.diff || {}) as Record<string, { changed: boolean }>;

    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(proposed)) {
      if (body.selected_fields && !body.selected_fields.includes(k)) continue;
      if (!diff[k]?.changed) continue;
      updates[k] = v;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No fields selected to apply");
    }

    // Track freshness on entities that have it
    if (["college", "institute", "article"].includes(refresh.entity_type)) {
      (updates as any).last_seo_refresh = new Date().toISOString();
    }

    const { error: updErr } = await supabase
      .from(table)
      .update(updates)
      .eq("id", refresh.entity_id);
    if (updErr) throw new Error(`Failed to update ${table}: ${updErr.message}`);

    await supabase
      .from("content_refreshes")
      .update({
        status: "approved",
        reviewed_by: body.reviewed_by || null,
        reviewed_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq("id", body.refresh_id);

    return new Response(
      JSON.stringify({ success: true, status: "approved", fields_applied: Object.keys(updates).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("apply-content-refresh error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
