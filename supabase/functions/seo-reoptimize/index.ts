// seo-reoptimize — Re-SEO job queue endpoint.
//
// POST /                  → enqueue a new run.
//   body: { pages: [...], label?, scope?, options?, run_at? (ISO), priority? }
//   • run_at in the future → status='queued', worker not kicked; scheduler picks it up when due.
//   • run_at omitted / past → status='running', worker kicked immediately (non-blocking).
//
// GET  /?run_id=...       → returns run + items (live progress dialog).
// GET  /?list=1&limit=50  → returns recent runs (jobs panel).
// POST /?action=cancel    → { run_id } marks run for cancellation.
// POST /?action=rerun     → { run_id } re-queues failed items of a run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { applyReseoResult } from "../_shared/applyReseo.ts";

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
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (req.method === "GET") {
    const runId = url.searchParams.get("run_id");
    if (runId) {
      const { data: run } = await sb.from("seo_reoptimization_runs").select("*").eq("id", runId).maybeSingle();
      if (!run) return json(404, { error: "run not found" });
      const { data: items } = await sb.from("seo_reoptimization_items")
        .select("id,page_type,slug,url,page_name,status,stage,old_primary_keyword,new_primary_keyword,secondary_keyword,search_intent,rewrite_applied,score_before,score_after,error,attempts,started_at,finished_at")
        .eq("run_id", runId).order("created_at", { ascending: true });
      return json(200, { run, items: items || [] });
    }
    if (url.searchParams.get("list")) {
      const limit = Math.min(200, Number(url.searchParams.get("limit") || 50));
      const { data: runs } = await sb.from("seo_reoptimization_runs")
        .select("id,label,scope,status,total_items,processed,succeeded,failed,run_at,priority,cancel_requested,started_at,finished_at,created_at")
        .order("created_at", { ascending: false }).limit(limit);
      return json(200, { runs: runs || [] });
    }
    return json(400, { error: "run_id or list=1 required" });
  }

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const body = await req.json().catch(() => ({}));

  // ── Cancel a run ───────────────────────────────────────────────
  if (action === "cancel") {
    const runId = body?.run_id;
    if (!runId) return json(400, { error: "run_id required" });
    await sb.from("seo_reoptimization_runs")
      .update({ cancel_requested: true })
      .eq("id", runId).in("status", ["queued", "running"]);
    EdgeRuntime.waitUntil(kickWorker(runId)); // wake the worker so it processes the cancel
    return json(200, { ok: true });
  }

  // ── Re-queue failed items in a run ─────────────────────────────
  if (action === "rerun") {
    const runId = body?.run_id;
    if (!runId) return json(400, { error: "run_id required" });
    const { count } = await sb.from("seo_reoptimization_items")
      .update({ status: "queued", error: null, started_at: null, finished_at: null, attempts: 0 }, { count: "exact" })
      .eq("run_id", runId).eq("status", "failed");
    await sb.from("seo_reoptimization_runs")
      .update({ status: "running", cancel_requested: false, finished_at: null }).eq("id", runId);
    EdgeRuntime.waitUntil(kickWorker(runId));
    return json(200, { requeued: count || 0 });
  }

  // ── Apply a preview item's proposed changes ────────────────────
  if (action === "apply") {
    const itemIds: string[] = Array.isArray(body?.item_ids) ? body.item_ids : (body?.item_id ? [body.item_id] : []);
    if (!itemIds.length) return json(400, { error: "item_id or item_ids required" });
    const { data: items, error: itErr } = await sb.from("seo_reoptimization_items")
      .select("*").in("id", itemIds);
    if (itErr) return json(500, { error: itErr.message });
    const results: any[] = [];
    for (const it of items || []) {
      if (it.status !== "done") { results.push({ id: it.id, skipped: "not done" }); continue; }
      if (it.applied) { results.push({ id: it.id, skipped: "already applied" }); continue; }
      const after = it.after_snapshot || {};
      try {
        await applyReseoResult(sb, {
          slug: it.slug,
          runId: it.run_id,
          pageType: it.page_type,
          pageId: it.page_id,
          meta_title: after.title,
          meta_description: after.description,
          h1: after.h1,
          intro_html: after.intro_html,
          body_html: after.body_html || it.full_content_after,
          primary_keyword: it.new_primary_keyword,
          secondary_keyword: it.secondary_keyword,
          search_intent: it.search_intent,
          long_tail_keywords: it.long_tail_keywords || [],
          related_queries: it.related_queries || [],
          keyword_density: it.keyword_density || {},
          faq: after.faq,
          json_ld: after.json_ld,
        });
        await sb.from("seo_reoptimization_items")
          .update({ applied: true, applied_at: new Date().toISOString(), discarded: false, discarded_at: null })
          .eq("id", it.id);
        results.push({ id: it.id, applied: true });
      } catch (e: any) {
        results.push({ id: it.id, error: String(e?.message || e) });
      }
    }
    return json(200, { results });
  }

  // ── Discard a preview item's proposed changes ──────────────────
  if (action === "discard") {
    const itemIds: string[] = Array.isArray(body?.item_ids) ? body.item_ids : (body?.item_id ? [body.item_id] : []);
    if (!itemIds.length) return json(400, { error: "item_id or item_ids required" });
    await sb.from("seo_reoptimization_items")
      .update({ discarded: true, discarded_at: new Date().toISOString() })
      .in("id", itemIds).eq("applied", false);
    return json(200, { ok: true });
  }


  // ── Enqueue a new run ──────────────────────────────────────────
  const pages = Array.isArray(body.pages) ? body.pages : [];
  if (!pages.length) return json(400, { error: "pages array required" });

  const authHeader = req.headers.get("Authorization")!;
  const sbUser = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData } = await sbUser.auth.getUser(authHeader.replace("Bearer ", ""));
  const startedBy = userData?.user?.id || null;

  const runAt = body.run_at ? new Date(body.run_at) : null;
  const scheduled = runAt && runAt.getTime() > Date.now() + 5_000;

  const { data: run, error: runErr } = await sb.from("seo_reoptimization_runs").insert({
    label: body.label || `Re-SEO ${new Date().toISOString().slice(0, 16)}`,
    scope: body.scope || "selected",
    total_items: pages.length,
    started_by: startedBy,
    options: body.options || {},
    status: scheduled ? "queued" : "running",
    run_at: runAt ? runAt.toISOString() : null,
    priority: typeof body.priority === "number" ? body.priority : 100,
  }).select("*").single();
  if (runErr) return json(500, { error: runErr.message });

  const items = pages.map((p: any) => ({
    run_id: run.id,
    page_type: String(p.page_type || "static"),
    page_id: p.page_id ? String(p.page_id) : null,
    slug: String(p.slug || p.url || ""),
    url: String(p.url || ""),
    page_name: p.page_name ? String(p.page_name) : null,
    old_primary_keyword: p.existing_primary_keyword || p.old_primary_keyword || null,
    score_before: typeof p.score_before === "number" ? p.score_before : null,
  }));
  const { error: itErr } = await sb.from("seo_reoptimization_items").insert(items);
  if (itErr) return json(500, { error: itErr.message });

  if (!scheduled) EdgeRuntime.waitUntil(kickWorker(run.id));

  return json(200, { run_id: run.id, total: items.length, scheduled, run_at: run.run_at });
});
