// seo-reoptimize — enqueue and status endpoint for the Re-SEO workflow.
//
// POST { pages: [{ page_type, page_id?, slug, url, page_name?, existing_primary_keyword? }], label?, options? }
//   → creates a run, enqueues one item per page, kicks the worker in the background.
// GET  ?run_id=...
//   → returns run + items (for the live progress dialog).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/requireAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function kickWorker(runId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/seo-reoptimize-worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ run_id: runId }),
    });
  } catch (e) {
    console.error("kickWorker failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const unauth = await requireAdmin(req, corsHeaders);
  if (unauth) return unauth;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const runId = url.searchParams.get("run_id");
    if (!runId) return json(400, { error: "run_id required" });
    const { data: run } = await sb.from("seo_reoptimization_runs").select("*").eq("id", runId).maybeSingle();
    if (!run) return json(404, { error: "run not found" });
    const { data: items } = await sb.from("seo_reoptimization_items")
      .select("id,page_type,slug,url,page_name,status,stage,old_primary_keyword,new_primary_keyword,secondary_keyword,search_intent,rewrite_applied,score_before,score_after,error,attempts,started_at,finished_at")
      .eq("run_id", runId).order("created_at", { ascending: true });
    return json(200, { run, items: items || [] });
  }

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const body = await req.json().catch(() => ({}));
  const pages = Array.isArray(body.pages) ? body.pages : [];
  if (!pages.length) return json(400, { error: "pages array required" });

  // Identify starter user for audit log
  const authHeader = req.headers.get("Authorization")!;
  const sbUser = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData } = await sbUser.auth.getUser(authHeader.replace("Bearer ", ""));
  const startedBy = userData?.user?.id || null;

  const { data: run, error: runErr } = await sb.from("seo_reoptimization_runs").insert({
    label: body.label || `Re-SEO ${new Date().toISOString().slice(0, 16)}`,
    scope: body.scope || "selected",
    total_items: pages.length,
    started_by: startedBy,
    options: body.options || {},
    status: "running",
  }).select("*").single();
  if (runErr) return json(500, { error: runErr.message });

  const items = pages.map((p: any) => ({
    run_id: run.id,
    page_type: String(p.page_type || "static"),
    page_id: p.page_id ? String(p.page_id) : null,
    slug: String(p.slug || p.url || ""),
    url: String(p.url || ""),
    page_name: p.page_name ? String(p.page_name) : null,
    old_primary_keyword: p.existing_primary_keyword || null,
    score_before: typeof p.score_before === "number" ? p.score_before : null,
  }));
  const { error: itErr } = await sb.from("seo_reoptimization_items").insert(items);
  if (itErr) return json(500, { error: itErr.message });

  // Kick worker in background without awaiting
  EdgeRuntime.waitUntil(kickWorker(run.id));

  return json(200, { run_id: run.id, total: items.length });
});
