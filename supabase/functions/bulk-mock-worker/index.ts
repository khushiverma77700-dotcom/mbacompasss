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
const DISPATCH_LOCK_MS = 2 * 60_000;
const DISPATCH_TIMEOUT_MS = 45_000;
// Max items per batch generating in parallel. 3 = sweet spot with 200K TPM.
const MAX_ACTIVE_PER_BATCH = 3;
const SECTION_LOCK_MS = 8 * 60_000;
const MAX_ACTIVE_SECTIONS_PER_GENERATION = 3;


async function reconcile(admin: any) {
  const nowIso = new Date().toISOString();
  // Recover rows where the worker died after marking "processing" but before
  // generate-mock-questions returned a generation_id. These are the rows that
  // made bulk batches look permanently stuck after only one real mock started.
  await admin
    .from("bulk_mock_request_items")
    .update({ status: "pending", worker_lock_until: null, error_message: "Recovered stale dispatch — queued again" })
    .eq("status", "processing")
    .is("generation_id", null)
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${nowIso}`);

  // Recover section workers whose lock expired. Without this, a section can sit
  // forever as "queued/processing" after an Edge runtime shutdown.
  await admin
    .from("mock_section_jobs")
    .update({
      status: "pending",
      worker_lock_until: null,
      current_step: "Auto-recovered stale section worker — queued again",
      updated_at: nowIso,
    })
    .eq("status", "processing")
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${nowIso}`);

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
    const { data: jobs } = await admin
      .from("mock_section_jobs")
      .select("status, questions_done, total_questions")
      .eq("generation_id", item.generation_id);
    const generatedFromJobs = (jobs || []).reduce((s: number, j: any) => s + (Number(j.questions_done) || 0), 0);
    const requestedFromJobs = (jobs || []).reduce((s: number, j: any) => s + (Number(j.total_questions) || 0), 0);
    const jobsOpen = (jobs || []).some((j: any) => ["pending", "processing"].includes(String(j.status)));
    const jobsFailed = (jobs || []).some((j: any) => String(j.status) === "failed");
    const generated = generatedFromJobs || (gen.total_generated ?? 0);
    let nextStatus: string | null = null;
    let errorMessage: string | null = null;
    if (gen.status === "completed" || ((jobs || []).length > 0 && !jobsOpen && !jobsFailed && requestedFromJobs > 0 && generated >= requestedFromJobs)) {
      nextStatus = generated > 0 ? "completed" : "failed";
      if (generated === 0) errorMessage = "Generation finished without producing any questions";
    } else if (gen.status === "failed" || ((jobs || []).length > 0 && !jobsOpen && jobsFailed)) {
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

async function kickPendingSectionJobs(admin: any, limit = 6) {
  const nowIso = new Date().toISOString();
  const { data: activeRows } = await admin
    .from("mock_section_jobs")
    .select("generation_id")
    .eq("status", "processing")
    .gt("worker_lock_until", nowIso);
  const activeByGeneration = new Map<string, number>();
  for (const row of activeRows || []) {
    const key = String(row.generation_id || "");
    if (key) activeByGeneration.set(key, (activeByGeneration.get(key) || 0) + 1);
  }

  const { data: pending } = await admin
    .from("mock_section_jobs")
    .select("id,generation_id,error_message")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

  let kicked = 0;
  for (const job of pending || []) {
    if (kicked >= limit) break;
    const generationId = String(job.generation_id || "");
    if (!generationId) continue;
    const errText = String(job.error_message || "").toLowerCase();
    if (errText.includes("exceeded your current quota") || errText.includes("quota/rate-limit blocked") || errText.includes("billing")) continue;
    if ((activeByGeneration.get(generationId) || 0) >= MAX_ACTIVE_SECTIONS_PER_GENERATION) continue;

    const lockUntil = new Date(Date.now() + SECTION_LOCK_MS).toISOString();
    await admin
      .from("mock_section_jobs")
      .update({
        status: "processing",
        current_step: "Watchdog kicked off worker…",
        worker_lock_until: lockUntil,
        updated_at: nowIso,
      })
      .eq("id", job.id)
      .eq("status", "pending");

    const kick = fetchWithTimeout(`${SUPABASE_URL}/functions/v1/retry-mock-section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({ job_id: job.id, auto: true, service: true, internal_secret: SERVICE_KEY }),
    }, 10_000).catch(async (e) => {
      await admin
        .from("mock_section_jobs")
        .update({
          status: "pending",
          worker_lock_until: null,
          current_step: `Worker kickoff retry scheduled: ${String(e?.message || e).slice(0, 160)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    });
    // @ts-ignore EdgeRuntime is available in Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(kick);
    kicked++;
    activeByGeneration.set(generationId, (activeByGeneration.get(generationId) || 0) + 1);
  }
  return kicked;
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function dispatchItem(admin: any, item: any, auth: { userToken?: string; asUserId?: string }) {
  const nowIso = new Date().toISOString();
  const lockIso = new Date(Date.now() + DISPATCH_LOCK_MS).toISOString();
  const { data: claimed } = await admin
    .from("bulk_mock_request_items")
    .update({
      status: "processing",
      started_at: item.started_at ?? nowIso,
      retry_count: (item.retry_count ?? 0) + 1,
      worker_lock_until: lockIso,
      error_message: null,
    })
    .eq("id", item.id)
    .eq("paused", false)
    .is("generation_id", null)
    .in("status", ["pending", "processing"])
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${nowIso}`)
    .select("*")
    .maybeSingle();
  if (!claimed) return false;

  try {
    // Build headers: either user Bearer (online admin) OR internal pump key
    // with stored admin user id (cron / laptop-off pump).
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    };
    const reqBody: Record<string, any> = {
      exam_code: claimed.exam_code,
      category: claimed.category,
      level: claimed.level,
      questions_per_set: claimed.questions_per_set,
      sets: claimed.sets,
      section_code: claimed.section_code || undefined,
      topic: claimed.topic || undefined,
      test_name_prefix: claimed.test_name_prefix || undefined,
    };
    if (auth.userToken) {
      headers.Authorization = `Bearer ${auth.userToken}`;
    } else if (auth.asUserId) {
      headers["x-internal-pump-key"] = SERVICE_KEY;
      reqBody._as_user_id = auth.asUserId;
    } else {
      throw new Error("No auth provided for dispatch");
    }

    const resp = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/generate-mock-questions`, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
    }, DISPATCH_TIMEOUT_MS);
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await admin
        .from("bulk_mock_request_items")
        .update({
          status: (claimed.retry_count ?? 0) >= 5 ? "failed" : "pending",
          error_message: result?.error || `Dispatch HTTP ${resp.status}`,
          worker_lock_until: null,
          finished_at: (claimed.retry_count ?? 0) >= 5 ? new Date().toISOString() : null,
        })
        .eq("id", claimed.id);
      return false;
    }
    const generationId = result?.generation_id || result?.gen_id || null;
    if (!generationId) throw new Error("Generation did not return an id");
    await admin
      .from("bulk_mock_request_items")
      .update({
        status: "processing",
        generation_id: generationId,
        worker_lock_until: null,
        total_requested: result?.total_requested ?? claimed.questions_per_set * claimed.sets,
      })
      .eq("id", claimed.id);
    return true;
  } catch (e: any) {
    const attempts = (claimed.retry_count ?? 0) + 1;
    await admin
      .from("bulk_mock_request_items")
      .update({
        status: attempts >= 6 ? "failed" : "pending",
        error_message: attempts >= 6 ? (e?.message ?? "dispatch error") : `Dispatch retry scheduled: ${e?.message ?? "temporary error"}`,
        worker_lock_until: null,
        finished_at: attempts >= 6 ? new Date().toISOString() : null,
      })
      .eq("id", claimed.id);
    return false;
  }
}

async function pumpPending(admin: any, auth: { userToken?: string; asUserId?: string }, limit = 3) {
  const nowIso = new Date().toISOString();
  const { data: activeByRequest } = await admin
    .from("bulk_mock_request_items")
    .select("request_id")
    .eq("paused", false)
    .eq("status", "processing");
  const activeCounts = new Map<string, number>();
  for (const row of activeByRequest || []) {
    activeCounts.set(row.request_id, (activeCounts.get(row.request_id) || 0) + 1);
  }
  // Fetch a wide window of pending items (across batches) so a saturated
  // older batch can't starve newer single-mock batches. We still cap the
  // number we actually dispatch to `limit` globally.
  const { data: pending } = await admin
    .from("bulk_mock_request_items")
    .select("*, bulk_mock_requests!inner(created_by)")
    .eq("paused", false)
    .is("generation_id", null)
    .in("status", ["pending", "processing"])
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(100);

  let dispatched = 0;
  for (const itm of pending ?? []) {
    if (dispatched >= limit) break;
    if ((activeCounts.get(itm.request_id) || 0) >= MAX_ACTIVE_PER_BATCH) continue;
    const itemAuth = auth.userToken
      ? { userToken: auth.userToken }
      : { asUserId: itm.bulk_mock_requests?.created_by };
    if (!itemAuth.userToken && !itemAuth.asUserId) continue;
    if (await dispatchItem(admin, itm, itemAuth)) {
      dispatched++;
      activeCounts.set(itm.request_id, (activeCounts.get(itm.request_id) || 0) + 1);
    }
  }
  return dispatched;
}



async function legacyDispatchItem(admin: any, item: any, userToken: string) {
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
  const internalKey = req.headers.get("x-internal-pump-key") || "";
  const isInternal = !!internalKey && internalKey === SERVICE_KEY;

  // Always reconcile first.
  const reconciled = await reconcile(admin);

  // ---- Cron / internal-key pump (runs even when no admin is online) ----
  // Used by pg_cron every minute so generation keeps progressing while the
  // admin's laptop is off. Pumps up to 3 pending items globally using each
  // batch's stored created_by admin via the internal-pump header.
  if (isInternal) {
    const dispatched = await pumpPending(admin, {}, 3);
    return json(200, { ok: true, mode: "internal-pump", reconciled, dispatched });
  }

  // Reconcile-only mode.
  if (body?.reconcile && !body?.items && !body?.resume_id) {
    if (!userToken) return json(200, { ok: true, mode: "reconcile", reconciled, dispatched: 0 });
    // Continue below to validate the admin and pump stalled/pending rows.
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

  if (body?.reconcile && !body?.items && !body?.resume_id) {
    const dispatched = await pumpPending(admin, { userToken }, 3);
    return json(200, { ok: true, mode: "reconcile", reconciled, dispatched });
  }

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
    EdgeRuntime.waitUntil(dispatchItem(admin, itm, { userToken }));
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

  // Start every inserted row. Each dispatch only needs generate-mock-questions
  // to return its 202 + generation_id; the heavy AI work remains in section workers.
  const runAll = async () => { await pumpPending(admin, { userToken }, inserted?.length ?? 0); };

  // @ts-ignore
  EdgeRuntime.waitUntil(runAll());

  return json(200, {
    ok: true,
    request_id: parent.id,
    queued: inserted?.length ?? 0,
    reconciled,
  });
});
