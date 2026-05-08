// Bulk Mock Worker — claims pending bulk_mock_request_items and dispatches them
// to the existing generate-mock-questions function. Also reconciles status of
// in-flight items by reading ai_mock_generations + mock_section_jobs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // Optional max items per tick (default 3 to avoid overloading the AI gateway).
  let maxClaim = 3;
  let callerToken: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.max === "number") maxClaim = Math.max(1, Math.min(10, body.max));
    if (typeof body?.auth === "string") callerToken = body.auth;
  } catch { /* no body — cron */ }

  // ── 1. Reconcile in-flight items ─────────────────────────────────────────────
  const { data: processing } = await admin
    .from("bulk_mock_request_items")
    .select("id, generation_id, total_requested")
    .eq("status", "processing")
    .not("generation_id", "is", null);

  for (const item of processing ?? []) {
    const { data: gen } = await admin
      .from("ai_mock_generations")
      .select("status, total_generated")
      .eq("id", item.generation_id)
      .maybeSingle();
    if (!gen) continue;

    const generated = gen.total_generated ?? 0;
    let nextStatus = "processing";
    let finishedAt: string | null = null;
    let errorMessage: string | null = null;

    if (gen.status === "completed") {
      nextStatus = generated > 0 ? "completed" : "failed";
      finishedAt = new Date().toISOString();
      if (generated === 0) errorMessage = "Generation finished without producing any questions";
    } else if (gen.status === "failed") {
      nextStatus = generated > 0 ? "needs_review" : "failed";
      finishedAt = new Date().toISOString();
      errorMessage = generated > 0
        ? "Some sections failed — review generated mock"
        : "Generation failed";
    }

    await admin
      .from("bulk_mock_request_items")
      .update({
        status: nextStatus,
        total_generated: generated,
        finished_at: finishedAt,
        error_message: errorMessage,
      })
      .eq("id", item.id);
  }

  // ── 2. Claim & dispatch new pending items ────────────────────────────────────
  const { data: pending } = await admin
    .from("bulk_mock_request_items")
    .select("*")
    .eq("status", "pending")
    .eq("paused", false)
    .order("created_at", { ascending: true })
    .limit(maxClaim);

  let dispatched = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of pending ?? []) {
    // Mark processing first to avoid double-claim.
    const { error: claimErr } = await admin
      .from("bulk_mock_request_items")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        retry_count: (item.retry_count ?? 0) + 1,
        worker_lock_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .eq("id", item.id)
      .eq("status", "pending"); // optimistic lock
    if (claimErr) continue;

    // Call generate-mock-questions as the admin who created the batch.
    // We invoke it via HTTP using service-role JWT so RLS+role checks pass.
    try {
      const resp = await fetch(`${url}/functions/v1/generate-mock-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use service role; the function checks user_roles for admin.
          // To satisfy that, we forward callerToken if available — otherwise
          // rely on a service-side bypass: we set created_by directly below.
          Authorization: `Bearer ${callerToken ?? serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          exam_code: item.exam_code,
          category: item.category,
          level: item.level,
          questions_per_set: item.questions_per_set,
          sets: item.sets,
          section_code: item.section_code || undefined,
          topic: item.topic || undefined,
          test_name_prefix: item.test_name_prefix || undefined,
        }),
      });
      const result = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        await admin
          .from("bulk_mock_request_items")
          .update({
            status: "failed",
            error_message: result?.error || `HTTP ${resp.status}`,
            finished_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        errors.push({ id: item.id, error: result?.error || `HTTP ${resp.status}` });
        continue;
      }

      const generationId = result?.generation_id || result?.gen_id || null;
      await admin
        .from("bulk_mock_request_items")
        .update({
          generation_id: generationId,
          total_requested: result?.total_requested ?? item.questions_per_set * item.sets,
        })
        .eq("id", item.id);

      dispatched++;
    } catch (e: any) {
      await admin
        .from("bulk_mock_request_items")
        .update({
          status: "failed",
          error_message: e?.message ?? "dispatch error",
          finished_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      errors.push({ id: item.id, error: e?.message ?? "dispatch error" });
    }
  }

  // ── 3. Roll up parent request status ─────────────────────────────────────────
  const { data: parents } = await admin
    .from("bulk_mock_requests")
    .select("id")
    .in("status", ["queued", "running"]);
  for (const p of parents ?? []) {
    const { data: items } = await admin
      .from("bulk_mock_request_items")
      .select("status")
      .eq("request_id", p.id);
    if (!items?.length) continue;
    const open = items.some((i) => i.status === "pending" || i.status === "processing");
    let next = "running";
    if (!open) {
      const anyFail = items.some((i) => i.status === "failed");
      const anyOk = items.some((i) => i.status === "completed" || i.status === "needs_review");
      next = anyFail && anyOk ? "partial" : anyFail ? "failed" : "completed";
    }
    await admin.from("bulk_mock_requests").update({ status: next }).eq("id", p.id);
  }

  return json(200, {
    ok: true,
    reconciled: processing?.length ?? 0,
    dispatched,
    errors,
  });
});
