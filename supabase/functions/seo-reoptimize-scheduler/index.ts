// seo-reoptimize-scheduler — cron-triggered dispatcher for scheduled Re-SEO runs.
// Finds queued runs whose run_at is due (or null) and kicks the worker for each.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_CONCURRENT_DISPATCH = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const nowIso = new Date().toISOString();
  const { data: due } = await sb.from("seo_reoptimization_runs")
    .select("id,run_at,priority")
    .eq("status", "queued")
    .eq("cancel_requested", false)
    .or(`run_at.is.null,run_at.lte.${nowIso}`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_CONCURRENT_DISPATCH);

  const runs = due || [];
  for (const r of runs) {
    // Flip to running so we don't re-dispatch on the next tick.
    await sb.from("seo_reoptimization_runs")
      .update({ status: "running", started_at: nowIso })
      .eq("id", r.id).eq("status", "queued");
    // Kick the worker without awaiting so all due jobs start in parallel.
    fetch(`${SUPABASE_URL}/functions/v1/seo-reoptimize-worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
      body: JSON.stringify({ run_id: r.id }),
    }).catch((e) => console.warn("scheduler kick failed", r.id, e));
  }

  return json(200, { dispatched: runs.length });
});
