// Bulk College Creator - background worker
// Processes a CSV-style batch of colleges through the same AI pipeline
// as manual creation (ai-college-writer + colleges insert + auto-seo-engine FAQs).
// Runs in background via EdgeRuntime.waitUntil so the HTTP response returns immediately
// and the job continues even if the admin closes the tab.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CONCURRENCY = 1;
const AI_WRITER_MAX_ATTEMPTS = 3;
const AI_RETRY_BASE_DELAY_MS = 2500;
const ROWS_PER_INVOCATION = 1;
const AI_WRITER_TIMEOUT_MS = 85_000;
const STALE_PROCESSING_MS = 4 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableAIWriterFailure = (status: number, text: string) =>
  status === 408 || status === 429 || status >= 500 ||
  /malformed json|unterminated string|unexpected end|truncated|ai generation failed|empty college/i.test(text);

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const toInt = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  const m = String(v).replace(/,/g, "").match(/-?\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
};
const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = String(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
};

interface RowInput {
  index: number;
  name: string;
  city: string;
  state: string;
  primaryKeyword: string;
  type?: string;
  tier?: string;
  category?: string;
  slug?: string;
}

interface RowState {
  index: number;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: "pending" | "processing" | "duplicate" | "succeeded" | "failed";
  step?: string;
  attemptStartedAt?: string;
  collegeId?: string;
  error?: string;
  finalSlug?: string;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function processOne(
  admin: any,
  authHeader: string,
  job_id: string,
  rows: RowState[],
  rowsRef: { value: RowState[] },
  row: RowState,
  input: RowInput,
  cancelFlag: { v: boolean },
) {
  const updateRow = async (patch: Partial<RowState>) => {
    Object.assign(row, patch);
    rowsRef.value = [...rowsRef.value];
    await admin.from("bulk_college_jobs").update({
      rows: rowsRef.value,
      updated_at: new Date().toISOString(),
      current_activity: `Row ${row.index + 1}: ${row.name} — ${row.step || row.status}`,
    }).eq("id", job_id);
  };

  try {
    if (cancelFlag.v) {
      await updateRow({ status: "failed", step: "cancelled", error: "Cancelled by admin" });
      return;
    }

    await updateRow({ status: "processing", step: "researching", attemptStartedAt: new Date().toISOString() });

    const y = new Date().getFullYear();
    const dateContext = `Use ONLY the most recent verified data: ${y}-${y + 1} admission cycle, ${y - 1}-${y} placement reports. All fees, placement figures, ranking and seat numbers MUST reflect the latest published year.`;

    const aiBody = {
      name: input.name,
      slug: input.slug || slugify(input.name),
      city: input.city || undefined,
      state: input.state || undefined,
      type: input.type || "Private",
      tier: input.tier || "Tier 2",
      category: input.category || "Non-IIM",
      targetKeyword: input.primaryKeyword || input.name,
      secondaryKeywords: [],
      contentDateContext: dateContext,
    };

    let data: any = null;
    let lastAiError = "";
    for (let attempt = 1; attempt <= AI_WRITER_MAX_ATTEMPTS; attempt++) {
      if (cancelFlag.v) {
        await updateRow({ status: "failed", step: "cancelled", error: "Cancelled by admin" });
        return;
      }
      await updateRow({ step: attempt === 1 ? "researching" : `retrying AI writer (${attempt}/${AI_WRITER_MAX_ATTEMPTS})` });

      let aiRes: Response;
      try {
        aiRes = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/ai-college-writer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: ANON_KEY,
        },
        body: JSON.stringify(aiBody),
        }, AI_WRITER_TIMEOUT_MS);
      } catch (err) {
        lastAiError = err instanceof DOMException && err.name === "AbortError"
          ? `AI writer timed out after ${Math.round(AI_WRITER_TIMEOUT_MS / 1000)}s`
          : `AI writer request failed: ${err instanceof Error ? err.message : String(err)}`;
        if (attempt < AI_WRITER_MAX_ATTEMPTS) {
          await sleep(AI_RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        break;
      }

      const txt = await aiRes.text();
      if (aiRes.ok) {
        try {
          data = JSON.parse(txt);
          break;
        } catch (parseErr) {
          lastAiError = `AI writer returned invalid response JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
        }
      } else {
        lastAiError = `AI writer failed (${aiRes.status}): ${txt.slice(0, 300)}`;
        if (!isRetryableAIWriterFailure(aiRes.status, txt)) break;
      }

      if (attempt < AI_WRITER_MAX_ATTEMPTS) {
        await sleep(AI_RETRY_BASE_DELAY_MS * attempt);
      }
    }

    if (!data) throw new Error(lastAiError || "AI writer failed after retries");
    if (data?.error) throw new Error(data.error);
    if (!data?.college) throw new Error("AI returned empty college");

    // Cancelled during the (long) AI call? Discard the result — never save partial work.
    if (cancelFlag.v) {
      await updateRow({ status: "failed", step: "cancelled", error: "Cancelled by admin" });
      return;
    }

    await updateRow({ step: "saving" });

    const c = data.college;
    let finalSlug = c.slug || input.slug || slugify(input.name);
    const { data: existing } = await admin
      .from("colleges").select("id").eq("slug", finalSlug).maybeSingle();
    if (existing?.id) finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;

    const insertPayload: any = {
      name: c.name || input.name,
      slug: finalSlug,
      description: c.description || null,
      city: c.city || input.city || null,
      state: c.state || input.state || null,
      type: c.type || input.type || "Private",
      tier: c.tier || input.tier || "Tier 2",
      college_category: c.college_category || input.category || "Non-IIM",
      established: toInt(c.established),
      ranking: toInt(c.ranking),
      fees: c.fees || null,
      fees_lakhs: toNum(c.fees_lakhs),
      website: c.website || null,
      placement_avg: c.placement_avg || null,
      placement_highest: c.placement_highest || null,
      placement_median: c.placement_median || null,
      campus_size: c.campus_size || null,
      total_students: toInt(c.total_students),
      admission_process: c.admission_process || null,
      courses: Array.isArray(c.courses) && c.courses.length ? c.courses : null,
      accreditations: Array.isArray(c.accreditations) && c.accreditations.length ? c.accreditations : null,
      exams_accepted: Array.isArray(c.exams_accepted) && c.exams_accepted.length ? c.exams_accepted : null,
      top_recruiters: Array.isArray(c.top_recruiters) && c.top_recruiters.length ? c.top_recruiters : null,
      specializations: Array.isArray(c.specializations) && c.specializations.length ? c.specializations : null,
      meta_title: c.meta_title || null,
      meta_description: c.meta_description || null,
      keywords: Array.isArray(c.keywords) && c.keywords.length ? c.keywords : null,
      primary_keyword: c.primary_keyword || input.primaryKeyword || input.name,
      h1_tag: c.h1_tag || c.name || input.name,
      funnel_stage: c.funnel_stage || "consideration",
      last_seo_refresh: new Date().toISOString(),
    };

    // Last-chance cancel check before persisting to DB
    if (cancelFlag.v) {
      await updateRow({ status: "failed", step: "cancelled", error: "Cancelled by admin" });
      return;
    }

    const { data: inserted, error: insertErr } = await admin
      .from("colleges").insert(insertPayload).select("id").single();
    if (insertErr) throw insertErr;

    // Cancelled right after insert — roll back so nothing partial remains
    if (cancelFlag.v) {
      if (inserted?.id) {
        await admin.from("colleges").delete().eq("id", inserted.id);
      }
      await updateRow({ status: "failed", step: "cancelled", error: "Cancelled by admin" });
      return;
    }

    // Seed FAQs (same as manual) — skip if cancelled
    const faqs = Array.isArray(data?.faqs) ? data.faqs : [];
    if (faqs.length > 0 && inserted?.id && !cancelFlag.v) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/auto-seo-engine`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: ANON_KEY, "x-worker-key": SERVICE_ROLE },
          body: JSON.stringify({ mode: "seed_faqs", contentType: "college", pageId: inserted.id, faqs }),
        });
      } catch (_) { /* non-fatal */ }
    }

    await updateRow({ status: "succeeded", step: "done", collegeId: inserted.id, finalSlug, attemptStartedAt: undefined });
  } catch (e: any) {
    await updateRow({ status: "failed", step: "error", error: e?.message || "Unknown error", attemptStartedAt: undefined });
  }
}

async function runJob(job_id: string, authHeader: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: job, error: jobErr } = await admin
    .from("bulk_college_jobs").select("*").eq("id", job_id).maybeSingle();
  if (jobErr || !job) {
    console.error("Job not found", job_id, jobErr);
    return;
  }

  const allRows: RowState[] = (job.rows as RowState[]).map((r) => {
    if (r.status !== "processing") return r;
    const started = r.attemptStartedAt ? new Date(r.attemptStartedAt).getTime() : 0;
    const isStale = !started || Date.now() - started > STALE_PROCESSING_MS;
    return isStale
      ? { ...r, status: "pending", step: "requeued after stale worker", error: undefined, attemptStartedAt: undefined }
      : r;
  });
  const inputsByIndex: Record<number, RowInput> = (job.request_inputs as any) || {};

  await admin.from("bulk_college_jobs").update({
    status: "running",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rows: allRows,
    current_activity: "Starting…",
  }).eq("id", job_id);

  const pending = allRows
    .filter(r => r.status === "pending")
    .sort((a, b) => a.index - b.index)
    .slice(0, ROWS_PER_INVOCATION);
  const rowsRef = { value: allRows };

  // Background poller — flips cancelFlag immediately when admin cancels
  const cancelFlag = { v: false };
  let pollerStop = false;
  const poller = (async () => {
    while (!pollerStop && !cancelFlag.v) {
      const { data: cur } = await admin.from("bulk_college_jobs")
        .select("status").eq("id", job_id).maybeSingle();
      if (cur?.status === "cancelled") { cancelFlag.v = true; break; }
      await new Promise(r => setTimeout(r, 1500));
    }
  })();

  // Concurrency pool
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      if (cancelFlag.v) return;
      const myIdx = cursor++;
      if (myIdx >= pending.length) return;
      const row = pending[myIdx];
      const input = inputsByIndex[row.index];
      if (!input) {
        row.status = "failed";
        row.error = "Missing input";
        continue;
      }
      await processOne(admin, authHeader, job_id, allRows, rowsRef, row, input, cancelFlag);

      // Update aggregate counters
      const succeeded = rowsRef.value.filter(r => r.status === "succeeded").length;
      const failed = rowsRef.value.filter(r => r.status === "failed").length;
      const duplicates = rowsRef.value.filter(r => r.status === "duplicate").length;
      const completed = succeeded + failed + duplicates;
      await admin.from("bulk_college_jobs").update({
        succeeded, failed, duplicates_skipped: duplicates, completed, updated_at: new Date().toISOString(),
      }).eq("id", job_id);
    }
  });

  await Promise.all(workers);
  pollerStop = true;
  await poller.catch(() => {});

  if (cancelFlag.v) {
    // Mark any still-pending rows as cancelled
    for (const r of rowsRef.value) {
      if (r.status === "pending" || r.status === "processing") {
        r.status = "failed";
        (r as any).step = "cancelled";
        r.error = "Cancelled by admin";
      }
    }
    const succeeded = rowsRef.value.filter(r => r.status === "succeeded").length;
    const failed = rowsRef.value.filter(r => r.status === "failed").length;
    const duplicates = rowsRef.value.filter(r => r.status === "duplicate").length;
    await admin.from("bulk_college_jobs").update({
      rows: rowsRef.value,
      status: "cancelled",
      succeeded, failed, duplicates_skipped: duplicates,
      completed: succeeded + failed + duplicates,
      finished_at: new Date().toISOString(),
      current_activity: "Cancelled by admin",
    }).eq("id", job_id);
    return;
  }

  const succeeded = rowsRef.value.filter(r => r.status === "succeeded").length;
  const failed = rowsRef.value.filter(r => r.status === "failed").length;
  const duplicates = rowsRef.value.filter(r => r.status === "duplicate").length;
  const completed = succeeded + failed + duplicates;
  const remaining = rowsRef.value.filter(r => r.status === "pending").length;

  if (remaining > 0) {
    await admin.from("bulk_college_jobs").update({
      status: "pending",
      rows: rowsRef.value,
      succeeded,
      failed,
      duplicates_skipped: duplicates,
      completed,
      updated_at: new Date().toISOString(),
      current_activity: `Continuing… ${remaining} colleges remaining`,
    }).eq("id", job_id);

    // Start the next small chunk as a fresh invocation so long batches do not hit runtime limits.
    // @ts-ignore - EdgeRuntime is provided by Supabase Edge runtime
    EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/bulk-college-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: ANON_KEY,
        "x-worker-key": SERVICE_ROLE,
      },
      body: JSON.stringify({ action: "resume", job_id }),
    }).catch((e) => console.error("Failed to schedule next bulk college chunk", e)));
    return;
  }

  await admin.from("bulk_college_jobs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rows: rowsRef.value,
    succeeded,
    failed,
    duplicates_skipped: duplicates,
    completed,
    current_activity: "All done",
  }).eq("id", job_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action || "create";
    const isInternalResume = action === "resume" && req.headers.get("x-worker-key") === SERVICE_ROLE;
    const authHeader = req.headers.get("Authorization") || "";
    if (!isInternalResume && !authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let user: any = null;
    if (!isInternalResume) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const userRes = await userClient.auth.getUser();
    user = userRes.data.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    if (!isInternalResume) {
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    }

    if (action === "create") {
      const inputs: RowInput[] = body.rows || [];
      if (!Array.isArray(inputs) || inputs.length === 0) {
        return new Response(JSON.stringify({ error: "No rows" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Dedup against existing colleges (slug or case-insensitive name)
      const slugs = inputs.map(r => r.slug || slugify(r.name));
      const names = inputs.map(r => r.name.trim().toLowerCase());
      const { data: existSlugs } = await admin.from("colleges")
        .select("slug,name").in("slug", slugs);
      const { data: existNames } = await admin.from("colleges")
        .select("slug,name").in("name", inputs.map(r => r.name.trim()));
      const existSlugSet = new Set((existSlugs || []).map((r: any) => r.slug));
      const existNameSet = new Set([
        ...(existSlugs || []).map((r: any) => (r.name || "").toLowerCase()),
        ...(existNames || []).map((r: any) => (r.name || "").toLowerCase()),
      ]);

      const rowStates: RowState[] = inputs.map((r, i) => {
        const slug = r.slug || slugify(r.name);
        const isDup = existSlugSet.has(slug) || existNameSet.has(r.name.trim().toLowerCase());
        return {
          index: i,
          name: r.name,
          slug,
          city: r.city,
          state: r.state,
          status: isDup ? "duplicate" : "pending",
          error: isDup ? "Already exists" : undefined,
        };
      });

      const inputsByIndex: Record<number, RowInput> = {};
      inputs.forEach((r, i) => { inputsByIndex[i] = { ...r, index: i }; });

      const duplicates = rowStates.filter(r => r.status === "duplicate").length;

      const { data: job, error: insErr } = await admin.from("bulk_college_jobs").insert({
        created_by: user.id,
        status: "pending",
        total_rows: inputs.length,
        duplicates_skipped: duplicates,
        completed: duplicates,
        rows: rowStates,
        request_inputs: inputsByIndex,
        current_activity: `Queued ${inputs.length - duplicates} colleges (${duplicates} duplicates skipped)`,
      } as any).select("id").single();

      if (insErr) throw insErr;

      // Run in background — survives client disconnects
      // @ts-ignore - EdgeRuntime is provided by Supabase Edge runtime
      EdgeRuntime.waitUntil(runJob(job.id, authHeader));

      return new Response(JSON.stringify({ job_id: job.id, total: inputs.length, duplicates }), {
        status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resume") {
      const job_id = body.job_id;
      if (!job_id) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: corsHeaders });
      // @ts-ignore
      EdgeRuntime.waitUntil(runJob(job_id, isInternalResume ? `Bearer ${ANON_KEY}` : authHeader));
      return new Response(JSON.stringify({ ok: true }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("bulk-college-create error", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
