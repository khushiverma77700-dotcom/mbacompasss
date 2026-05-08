// Bulk Mock Worker
// Modes:
//   POST { items: [...], label } with user auth → create batch + dispatch each
//     in background via EdgeRuntime.waitUntil; returns request_id immediately.
//   POST { reconcile: true } (or empty body from cron) → only reconcile statuses
//     of in-flight items by reading ai_mock_generations.
//   POST { resume_id: "<item_id>" } with user auth → re-dispatch a single item.
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function reconcile(admin: any) {
  const { data: processing } = await admin
    .from("bulk_mock_request_items")
    .select("id, generation_id")
    .eq("status", "processing")
    .not("generation_id", "is", null);
  let updated = 0;
  for (const item of processing ?? []) {
    const { data: gen } = await admin
      .from("ai_mock_generations")
      .select("status, total_generated")
      .eq("id", item.generation_id)
      .maybeSingle();
    if (!gen) continue;
    const generated = gen.total_generated ?? 0;
    let nextStatus: string | null = null;
    let errorMessage: string | null = null;
    if (gen.status === "completed") {
      nextStatus = generated > 0 ? "completed" : "failed";
      if (generated === 0) errorMessage = "Generation finished without producing any questions";
    } else if (gen.status === "failed") {
      nextStatus = generated > 0 ? "needs_review" : "failed";
      errorMessage = generated > 0 ? "Some sections failed — review generated mock" : "Generation failed";
    }
    if (nextStatus) {
      await admin
        .from("bulk_mock_request_items")
        .update({
          status: nextStatus,
          total_generated: generated,
          finished_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", item.id);
      updated++;
    } else {
      // Still running — just refresh progress.
      await admin
        .from("bulk_mock_request_items")
        .update({ total_generated: generated })
        .eq("id", item.id);
    }
  }

  // Roll up parent request status.
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
    const open = items.some((i: any) => i.status === "pending" || i.status === "processing");
    let next = "running";
    if (!open) {
      const anyFail = items.some((i: any) => i.status === "failed");
      const anyOk = items.some((i: any) => i.status === "completed" || i.status === "needs_review");
      next = anyFail && anyOk ? "partial" : anyFail ? "failed" : "completed";
    }
    await admin.from("bulk_mock_requests").update({ status: next }).eq("id", p.id);
  }
  return updated;
}

async function dispatchItem(admin: any, item: any, userToken: string) {
  // Mark processing (optimistic).
  await admin
    .from("bulk_mock_request_items")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      retry_count: (item.retry_count ?? 0) + 1,
      error_message: null,
    })
    .eq("id", item.id);
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-mock-questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
        apikey: ANON_KEY,
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
      return;
    }
    const generationId = result?.generation_id || result?.gen_id || null;
    await admin
      .from("bulk_mock_request_items")
      .update({
        generation_id: generationId,
        total_requested: result?.total_requested ?? item.questions_per_set * item.sets,
      })
      .eq("id", item.id);
  } catch (e: any) {
    await admin
      .from("bulk_mock_request_items")
      .update({
        status: "failed",
        error_message: e?.message ?? "dispatch error",
        finished_at: new Date().toISOString(),
      })
      .eq("id", item.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const body = await req.json().catch(() => ({}));
  const auth = req.headers.get("Authorization") || "";
  const userToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // Always reconcile first.
  const reconciled = await reconcile(admin);

  // Reconcile-only mode.
  if (body?.reconcile && !body?.items && !body?.resume_id) {
    return json(200, { ok: true, mode: "reconcile", reconciled });
  }

  // Need user auth for any dispatch.
  if (!userToken) return json(200, { ok: true, mode: "reconcile", reconciled });

  // Validate user is admin.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return json(401, { error: "invalid auth" });
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json(403, { error: "admin only" });

  // Resume single item.
  if (body?.resume_id) {
    const { data: itm } = await admin
      .from("bulk_mock_request_items")
      .select("*")
      .eq("id", body.resume_id)
      .maybeSingle();
    if (!itm) return json(404, { error: "item not found" });
    await admin.from("bulk_mock_request_items").update({ paused: false }).eq("id", itm.id);
    // dispatch in background
    // @ts-ignore EdgeRuntime is available in Supabase Edge runtime
    EdgeRuntime.waitUntil(dispatchItem(admin, itm, userToken));
    return json(200, { ok: true, dispatched: 1 });
  }

  // Create new batch.
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return json(400, { error: "no items provided" });

  const { data: parent, error: pErr } = await admin
    .from("bulk_mock_requests")
    .insert({
      created_by: user.id,
      label: body?.label ?? null,
      total_items: items.length,
      status: "running",
    })
    .select("id")
    .single();
  if (pErr || !parent) return json(500, { error: pErr?.message || "failed to create request" });

  const rows = items.map((it: any) => ({
    request_id: parent.id,
    exam_code: String(it.exam_code || "CAT").toUpperCase(),
    category: String(it.category || "full_length"),
    level: String(it.level || "mixed"),
    section_code: it.section_code ? String(it.section_code).toUpperCase() : null,
    topic: it.topic ? String(it.topic).slice(0, 200) : null,
    questions_per_set: Math.max(1, Math.min(200, Number(it.questions_per_set) || 20)),
    sets: Math.max(1, Math.min(10, Number(it.sets) || 1)),
    test_name_prefix: it.test_name_prefix ? String(it.test_name_prefix).slice(0, 120) : null,
    total_requested: Math.max(1, Math.min(200, Number(it.questions_per_set) || 20)) *
      Math.max(1, Math.min(10, Number(it.sets) || 1)),
  }));
  const { data: inserted, error: iErr } = await admin
    .from("bulk_mock_request_items")
    .insert(rows)
    .select("*");
  if (iErr) return json(500, { error: iErr.message });

  // Dispatch sequentially in background with a short stagger to avoid overloading AI gateway.
  const runAll = async () => {
    for (const itm of inserted ?? []) {
      await dispatchItem(admin, itm, userToken);
      // small stagger
      await new Promise((r) => setTimeout(r, 1500));
    }
  };
  // @ts-ignore
  EdgeRuntime.waitUntil(runAll());

  return json(200, {
    ok: true,
    request_id: parent.id,
    queued: inserted?.length ?? 0,
    reconciled,
  });
});
