// Apply approved SEO proposal fields to page_seo_overrides. Admin-only.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: role } = await admin.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const { auditId, accepted } = await req.json();
    if (!auditId || !accepted) return json({ error: "auditId and accepted are required" }, 400);

    const { data: audit, error: aErr } = await admin.from("page_seo_audits")
      .select("id, slug, proposal").eq("id", auditId).maybeSingle();
    if (aErr || !audit) return json({ error: "Audit not found" }, 404);

    const p = audit.proposal || {};
    const upsert: Record<string, any> = {
      slug: audit.slug,
      source_audit_id: audit.id,
      applied_by: user.id,
      applied_at: new Date().toISOString(),
    };
    for (const f of ["title", "description", "h1", "intro_html", "og_image"] as const) {
      if (accepted[f] && p[f] !== undefined) upsert[f] = p[f];
    }
    if (accepted.keywords && Array.isArray(p.keywords)) upsert.keywords = p.keywords;
    if (accepted.faq && Array.isArray(p.faq)) upsert.faq = p.faq;
    if (accepted.json_ld && p.json_ld) upsert.json_ld = p.json_ld;

    const { error: upErr } = await admin.from("page_seo_overrides").upsert(upsert, { onConflict: "slug" });
    if (upErr) return json({ error: upErr.message }, 500);

    await admin.from("page_seo_audits").update({ approved: true, status: "approved" }).eq("id", auditId);
    return json({ ok: true, slug: audit.slug });
  } catch (e: any) {
    return json({ error: e?.message || "apply failed" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
