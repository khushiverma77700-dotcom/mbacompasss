// Master Refresh Enqueue — admin creates a server-side refresh job.
// Populates master_refresh_jobs + master_refresh_items, then kicks the worker
// once so it can start immediately (cron continues progress every minute).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";
import { requireAdmin } from "../_shared/requireAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TYPE_CFG: Record<string, { table: string; nameField: string; hasRefreshTs: boolean }> = {
  college:   { table: "colleges",   nameField: "name",  hasRefreshTs: true },
  institute: { table: "institutes", nameField: "name",  hasRefreshTs: true },
  course:    { table: "courses",    nameField: "name",  hasRefreshTs: false },
  article:   { table: "articles",   nameField: "title", hasRefreshTs: true },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await requireAdmin(req, corsHeaders);
  if (guard) return guard;

  try {
    const body = await req.json();
    const entityTypes: string[] = (body.entity_types || []).filter((t: string) => TYPE_CFG[t]);
    if (!entityTypes.length) throw new Error("entity_types required");
    const mode = body.mode === "full" ? "full" : "smart";
    const model = (typeof body.model === "string" && body.model.trim()) ? body.model.trim() : "openai/gpt-5-mini";
    const freshness = ["all", "30d", "90d", "never"].includes(body.freshness) ? body.freshness : "all";
    const concurrency = Math.min(Math.max(parseInt(body.concurrency) || 4, 1), 8);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get creator from auth token
    const authHeader = req.headers.get("Authorization")!;
    const { data: userData } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    const createdBy = userData?.user?.id || null;

    // Create job row
    const { data: job, error: jobErr } = await sb.from("master_refresh_jobs").insert({
      mode, model, freshness, entity_types: entityTypes, concurrency, created_by: createdBy, status: "queued",
    }).select().single();
    if (jobErr) throw jobErr;

    // Fetch and enqueue items per type
    const cutoff = (f: string) => {
      if (f === "30d") return new Date(Date.now() - 30 * 86400000).toISOString();
      if (f === "90d") return new Date(Date.now() - 90 * 86400000).toISOString();
      return null;
    };
    let total = 0;
    for (const t of entityTypes) {
      const cfg = TYPE_CFG[t];
      let q = sb.from(cfg.table).select(`id, ${cfg.nameField}`).limit(10000);
      if (cfg.hasRefreshTs && freshness !== "all") {
        if (freshness === "never") q = q.is("last_seo_refresh", null);
        else {
          const c = cutoff(freshness);
          if (c) q = q.or(`last_seo_refresh.is.null,last_seo_refresh.lt.${c}`);
        }
      }
      const { data: rows, error: rowsErr } = await q;
      if (rowsErr) throw rowsErr;
      const items = (rows || []).map((r: any) => ({
        job_id: job.id, entity_type: t, entity_id: r.id, entity_name: r[cfg.nameField] || "Untitled",
      }));
      // Insert in chunks
      for (let i = 0; i < items.length; i += 500) {
        const { error } = await sb.from("master_refresh_items").insert(items.slice(i, i + 500));
        if (error) throw error;
      }
      total += items.length;
    }

    await sb.from("master_refresh_jobs").update({ total, status: total > 0 ? "queued" : "completed", finished_at: total === 0 ? new Date().toISOString() : null }).eq("id", job.id);

    // Kick worker immediately (fire-and-forget)
    EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/master-refresh-worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(() => {}));

    return new Response(JSON.stringify({ job_id: job.id, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
