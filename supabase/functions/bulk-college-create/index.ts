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
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const CONCURRENCY = 1;
const AI_WRITER_MAX_ATTEMPTS = 1;
const AI_RETRY_BASE_DELAY_MS = 2500;
const ROWS_PER_INVOCATION = 10; // matches POOL_MAX so live concurrency 1–10 has real effect
const AI_WRITER_TIMEOUT_MS = 125_000;
const STALE_PROCESSING_MS = 4 * 60_000;

const LOCK_MS = 3 * 60_000;
const TELEMETRY_LIMIT = 80;

const computeCollegeMetrics = (rows: RowState[]) => {
  const succeeded = rows.filter(r => r.status === "succeeded").length;
  const failed = rows.filter(r => r.status === "failed").length;
  const duplicates = rows.filter(r => r.status === "duplicate").length;
  const pending = rows.filter(r => r.status === "pending").length;
  const processing = rows.filter(r => r.status === "processing").length;
  return {
    succeeded,
    failed,
    duplicates_skipped: duplicates,
    completed: succeeded + failed + duplicates,
    pending,
    processing,
    total: rows.length,
  };
};

const collegeMetricPatch = (metrics: ReturnType<typeof computeCollegeMetrics>) => ({
  succeeded: metrics.succeeded,
  failed: metrics.failed,
  duplicates_skipped: metrics.duplicates_skipped,
  completed: metrics.completed,
});

const textBytes = (value: string) => new TextEncoder().encode(value || "").length;

const memorySnapshot = () => {
  try {
    const m = (Deno as any).memoryUsage?.();
    if (!m) return null;
    return {
      rss: Math.round((m.rss || 0) / 1024 / 1024),
      heapTotal: Math.round((m.heapTotal || 0) / 1024 / 1024),
      heapUsed: Math.round((m.heapUsed || 0) / 1024 / 1024),
      external: Math.round((m.external || 0) / 1024 / 1024),
      unit: "MB",
      sampledAt: new Date().toISOString(),
    };
  } catch (_) {
    return null;
  }
};

class TelemetryTracker {
  state: any;
  wallStart = Date.now();

  constructor(initial: any, workerId: string) {
    const network = initial?.network || {};
    const cpu = initial?.cpu || {};
    this.state = {
      ...initial,
      workerId,
      startedAt: initial?.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeWorkers: 0,
      peakActiveWorkers: Math.max(initial?.peakActiveWorkers || 0, 0),
      cpu: {
        busyMs: Number(cpu.busyMs || 0),
        wallMs: Number(cpu.wallMs || 0),
        loadPct: Number(cpu.loadPct || 0),
      },
      memory: memorySnapshot() || initial?.memory || null,
      network: {
        requests: Number(network.requests || 0),
        success: Number(network.success || 0),
        failed: Number(network.failed || 0),
        requestBytes: Number(network.requestBytes || 0),
        responseBytes: Number(network.responseBytes || 0),
        latencyMsTotal: Number(network.latencyMsTotal || 0),
        avgLatencyMs: Number(network.avgLatencyMs || 0),
        lastStatus: network.lastStatus || null,
        statusCounts: network.statusCounts || {},
        recent: Array.isArray(network.recent) ? network.recent.slice(-25) : [],
      },
      db: { writes: Number(initial?.db?.writes || 0) },
      workerSlots: Array.isArray(initial?.workerSlots) ? initial.workerSlots.slice(-10) : [],
      healthTimeline: Array.isArray(initial?.healthTimeline) ? initial.healthTimeline.slice(-80) : [],
      timeline: Array.isArray(initial?.timeline) ? initial.timeline.slice(-TELEMETRY_LIMIT) : [],
      events: Array.isArray(initial?.events) ? initial.events.slice(-12) : [],
    };
  }

  incDbWrite(n = 1) {
    this.state.db.writes += n;
  }

  setActive(n: number) {
    this.state.activeWorkers = n;
    this.state.peakActiveWorkers = Math.max(this.state.peakActiveWorkers || 0, n);
  }

  updateSlot(slotIndex: number, patch: Record<string, unknown>) {
    const now = new Date().toISOString();
    const slots = Array.isArray(this.state.workerSlots) ? [...this.state.workerSlots] : [];
    slots[slotIndex] = {
      slot: slotIndex + 1,
      slot_id: `${this.state.workerId}:slot-${slotIndex + 1}`,
      job_id: patch.job_id || slots[slotIndex]?.job_id || null,
      state: patch.state || slots[slotIndex]?.state || "idle",
      last_heartbeat: now,
      last_processed_at: patch.last_processed_at || slots[slotIndex]?.last_processed_at || null,
      current_item: patch.current_item ?? slots[slotIndex]?.current_item ?? null,
      current_step: patch.current_step ?? slots[slotIndex]?.current_step ?? null,
      enabled: patch.enabled ?? slots[slotIndex]?.enabled ?? true,
    };
    this.state.workerSlots = slots.slice(0, 10);
  }

  addHealth(state: string, label: string, meta: Record<string, unknown> = {}) {
    this.state.healthTimeline = [
      ...(this.state.healthTimeline || []),
      { ts: Date.now(), state, label, job_id: meta.job_id || null, worker_id: this.state.workerId, ...meta },
    ].slice(-80);
  }

  addBusy(ms: number) {
    this.state.cpu.busyMs += Math.max(0, ms);
    this.state.cpu.wallMs += Math.max(1, Date.now() - this.wallStart);
    this.wallStart = Date.now();
    this.state.cpu.loadPct = Math.min(100, Math.round((this.state.cpu.busyMs / Math.max(1, this.state.cpu.wallMs)) * 100));
  }

  recordHttp(label: string, status: number, requestBytes: number, responseBytes: number, latencyMs: number) {
    const n = this.state.network;
    n.requests += 1;
    if (status >= 200 && status < 400) n.success += 1;
    else n.failed += 1;
    n.requestBytes += requestBytes;
    n.responseBytes += responseBytes;
    n.latencyMsTotal += latencyMs;
    n.avgLatencyMs = Math.round(n.latencyMsTotal / Math.max(1, n.requests));
    n.lastStatus = status || "error";
    n.statusCounts[String(n.lastStatus)] = (n.statusCounts[String(n.lastStatus)] || 0) + 1;
    const event = { ts: Date.now(), label, status: n.lastStatus, latencyMs, requestBytes, responseBytes };
    n.recent = [...(n.recent || []), event].slice(-25);
    this.state.timeline = [...(this.state.timeline || []), { ts: Date.now(), ops: 1, label, status: n.lastStatus }].slice(-TELEMETRY_LIMIT);
    this.state.events = [{ ts: Date.now(), kind: status >= 200 && status < 400 ? "ok" : "fail", msg: `${label} responded ${n.lastStatus} in ${latencyMs}ms` }, ...(this.state.events || [])].slice(0, 12);
  }

  recordProgress(completed: number, label: string) {
    this.state.timeline = [...(this.state.timeline || []), { ts: Date.now(), ops: 1, completed, label, status: "progress" }].slice(-TELEMETRY_LIMIT);
  }

  snapshot() {
    this.state.updatedAt = new Date().toISOString();
    this.state.memory = memorySnapshot() || this.state.memory;
    return this.state;
  }
}

async function claimWorkerLock(admin: any, table: string, jobId: string, workerId: string) {
  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + LOCK_MS).toISOString();
  const { data, error } = await admin
    .from(table)
    .update({ worker_id: workerId, worker_lock_until: lockUntil, updated_at: nowIso })
    .eq("id", jobId)
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${nowIso}`)
    .select("id");
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function updateBulkJob(admin: any, table: string, jobId: string, workerId: string, tracker: TelemetryTracker, patch: Record<string, unknown>) {
  tracker.incDbWrite();
  return admin.from(table).update({
    status: "running",
    ...patch,
    telemetry: tracker.snapshot(),
    worker_id: workerId,
    worker_lock_until: new Date(Date.now() + LOCK_MS).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("worker_id", workerId);
}

async function releaseWorkerLock(admin: any, table: string, jobId: string, workerId: string, tracker: TelemetryTracker, patch: Record<string, unknown>) {
  tracker.incDbWrite();
  return admin.from(table).update({
    ...patch,
    telemetry: tracker.snapshot(),
    worker_id: null,
    worker_lock_until: null,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("worker_id", workerId);
}


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

async function fetchWithTimeoutAndCancel(url: string, init: RequestInit, timeoutMs: number, cancelFlag?: { v: boolean }): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const cancelPoll = setInterval(() => {
    if (cancelFlag?.v) controller.abort("cancelled");
  }, 500);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    clearInterval(cancelPoll);
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
  tracker: TelemetryTracker,
  workerId: string,
  aiProvider: "gemini" | "lovable",
) {
  const updateRow = async (patch: Partial<RowState>) => {
    Object.assign(row, patch);
    rowsRef.value = [...rowsRef.value];
    tracker.recordProgress(rowsRef.value.filter(r => r.status === "succeeded" || r.status === "failed" || r.status === "duplicate").length, `${row.name} — ${row.step || row.status}`);
    await updateBulkJob(admin, "bulk_college_jobs", job_id, workerId, tracker, {
      rows: rowsRef.value,
      current_activity: `Row ${row.index + 1}: ${row.name} — ${row.step || row.status}`,
    });
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
      bulkMode: true,
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
      const aiRequestBody = JSON.stringify(aiBody);
      const aiStarted = Date.now();
      try {
        aiRes = await fetchWithTimeoutAndCancel(`${SUPABASE_URL}/functions/v1/ai-college-writer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: ANON_KEY,
          "X-AI-Provider": aiProvider,
        },
        body: aiRequestBody,
        }, AI_WRITER_TIMEOUT_MS, cancelFlag);
      } catch (err) {
        tracker.recordHttp("ai-college-writer", 0, textBytes(aiRequestBody), 0, Date.now() - aiStarted);
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
      tracker.recordHttp("ai-college-writer", aiRes.status, textBytes(aiRequestBody), textBytes(txt), Date.now() - aiStarted);
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

    tracker.incDbWrite();
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
        const seoBody = JSON.stringify({ mode: "seed_faqs", contentType: "college", pageId: inserted.id, faqs });
        const seoStarted = Date.now();
        const seoRes = await fetch(`${SUPABASE_URL}/functions/v1/auto-seo-engine`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: ANON_KEY, "x-worker-key": SERVICE_ROLE },
          body: seoBody,
        });
        const seoTxt = await seoRes.text().catch(() => "");
        tracker.recordHttp("auto-seo-engine", seoRes.status, textBytes(seoBody), textBytes(seoTxt), Date.now() - seoStarted);
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
  if (["completed", "cancelled"].includes(job.status)) return;
  if ((job as any).paused) {
    await admin.from("bulk_college_jobs").update({ status: "running", current_activity: "Paused — waiting for admin resume", updated_at: new Date().toISOString() }).eq("id", job_id);
    return;
  }
  const aiProvider: "gemini" | "lovable" = ((job as any).ai_provider === "lovable") ? "lovable" : "gemini";

  const workerId = crypto.randomUUID();
  const claimed = await claimWorkerLock(admin, "bulk_college_jobs", job_id, workerId);
  if (!claimed) {
    console.log("bulk college worker already active", job_id);
    return;
  }

  const tracker = new TelemetryTracker((job as any).telemetry, workerId);
    tracker.addHealth("locked", "Worker lock acquired", { job_id });

  try {
    const allRows: RowState[] = (job.rows as RowState[]).map((r) => {
      if (r.status !== "processing") return r;
      const started = r.attemptStartedAt ? new Date(r.attemptStartedAt).getTime() : 0;
      const isStale = !started || Date.now() - started > STALE_PROCESSING_MS;
      return isStale
        ? { ...r, status: "pending", step: "requeued after stale worker", error: undefined, attemptStartedAt: undefined }
        : r;
    });
    const inputsByIndex: Record<number, RowInput> = (job.request_inputs as any) || {};

    await updateBulkJob(admin, "bulk_college_jobs", job_id, workerId, tracker, {
      status: "running",
      started_at: job.started_at || new Date().toISOString(),
      rows: allRows,
      current_activity: "Worker claimed queue…",
    });

    const pending = allRows
      .filter(r => r.status === "pending")
      .sort((a, b) => a.index - b.index)
      .slice(0, ROWS_PER_INVOCATION);
    const rowsRef = { value: allRows };
    tracker.addHealth("queued", `${pending.length} row(s) queued for this worker run`, { job_id, queued: pending.length });

    const cancelFlag = { v: false };
    const pauseFlag = { v: false };
    const concurrencyRef = { v: Math.max(1, Math.min(10, Number((job as any).concurrency) || 1)) };
    let pollerStop = false;
    const poller = (async () => {
      while (!pollerStop && !cancelFlag.v) {
        const { data: cur } = await admin.from("bulk_college_jobs")
          .select("status,paused,concurrency").eq("id", job_id).maybeSingle();
        if (cur?.status === "cancelled") { cancelFlag.v = true; break; }
        pauseFlag.v = !!(cur as any)?.paused;
        const c = Number((cur as any)?.concurrency);
        if (c >= 1 && c <= 10) concurrencyRef.v = c;
        await sleep(1500);
      }
    })();

    let cursor = 0;
    const activeRef = { n: 0 };
    const slots = 10;
    const workers = Array.from({ length: slots }, async (_, slotIdx) => {
      while (true) {
        tracker.updateSlot(slotIdx, { job_id, enabled: slotIdx < concurrencyRef.v, state: slotIdx < concurrencyRef.v ? "idle" : "disabled" });
        if (cancelFlag.v || pauseFlag.v) {
          tracker.updateSlot(slotIdx, { job_id, state: pauseFlag.v ? "paused" : "cancelled", enabled: slotIdx < concurrencyRef.v });
          return;
        }
        if (slotIdx >= concurrencyRef.v) {
          tracker.updateSlot(slotIdx, { job_id, state: "disabled", enabled: false });
          if (cursor >= pending.length) return;
          await sleep(500);
          continue;
        }
        const myIdx = cursor++;
        if (myIdx >= pending.length) {
          tracker.updateSlot(slotIdx, { job_id, state: "idle", enabled: true });
          return;
        }
        const row = pending[myIdx];
        const input = inputsByIndex[row.index];
        if (!input) {
          row.status = "failed";
          row.error = "Missing input";
          tracker.updateSlot(slotIdx, { job_id, state: "failed", current_item: row.name, current_step: "missing input", last_processed_at: new Date().toISOString() });
          continue;
        }
        activeRef.n += 1;
        tracker.setActive(activeRef.n);
        tracker.updateSlot(slotIdx, { job_id, state: "processing", current_item: row.name, current_step: "starting" });
        tracker.addHealth("processing", `Slot ${slotIdx + 1} processing ${row.name}`, { job_id, slot: slotIdx + 1, row: row.index + 1 });
        const busyStarted = Date.now();
        try {
          await processOne(admin, authHeader, job_id, allRows, rowsRef, row, input, cancelFlag, tracker, workerId, aiProvider);
        } finally {
          tracker.addBusy(Date.now() - busyStarted);
          activeRef.n = Math.max(0, activeRef.n - 1);
          tracker.setActive(activeRef.n);
          tracker.updateSlot(slotIdx, { job_id, state: "idle", current_item: row.name, current_step: row.step || row.status, last_processed_at: new Date().toISOString() });
        }

        const liveMetrics = computeCollegeMetrics(rowsRef.value);
        tracker.recordProgress(liveMetrics.completed, row.name);
        await updateBulkJob(admin, "bulk_college_jobs", job_id, workerId, tracker, {
          ...collegeMetricPatch(liveMetrics),
        });
      }
    });

    await Promise.all(workers);
    pollerStop = true;
    await poller.catch(() => {});

    const finalMetrics = computeCollegeMetrics(rowsRef.value);

    if (cancelFlag.v) {
      for (const r of rowsRef.value) {
        if (r.status === "pending" || r.status === "processing") {
          r.status = "failed";
          (r as any).step = "cancelled";
          r.error = "Cancelled by admin";
          r.attemptStartedAt = undefined;
        }
      }
      await releaseWorkerLock(admin, "bulk_college_jobs", job_id, workerId, tracker, {
        rows: rowsRef.value,
        status: "cancelled",
        ...collegeMetricPatch(computeCollegeMetrics(rowsRef.value)),
        finished_at: new Date().toISOString(),
        current_activity: "Cancelled by admin",
      });
      return;
    }

    const { data: latest } = await admin.from("bulk_college_jobs")
      .select("paused,status").eq("id", job_id).maybeSingle();
    if ((latest as any)?.paused) {
      tracker.addHealth("paused", "Worker parked after admin pause", { job_id });
      await releaseWorkerLock(admin, "bulk_college_jobs", job_id, workerId, tracker, {
        status: "running",
        rows: rowsRef.value,
        ...collegeMetricPatch(finalMetrics),
        current_activity: "Paused — worker parked safely",
      });
      return;
    }

    const remaining = finalMetrics.pending;

    if (remaining > 0) {
      tracker.addHealth("resumed", `Worker run complete; scheduling next chunk with ${remaining} pending`, { job_id, remaining });
      await releaseWorkerLock(admin, "bulk_college_jobs", job_id, workerId, tracker, {
        status: "running",
        rows: rowsRef.value,
        ...collegeMetricPatch(finalMetrics),
        current_activity: `Continuing… ${remaining} colleges remaining`,
      });

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

    tracker.addHealth("completed", "All rows completed", { job_id });
    await releaseWorkerLock(admin, "bulk_college_jobs", job_id, workerId, tracker, {
      status: "completed",
      finished_at: new Date().toISOString(),
      rows: rowsRef.value,
      ...collegeMetricPatch(finalMetrics),
      current_activity: "All done",
    });
  } catch (err) {
    console.error("bulk college runJob failed", err);
    await releaseWorkerLock(admin, "bulk_college_jobs", job_id, workerId, tracker, {
        status: "running",
      current_activity: `Worker recovered from error: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {});
  }
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
        status: "running",
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
      EdgeRuntime.waitUntil(runJob(job_id, authHeader || `Bearer ${ANON_KEY}`));
      return new Response(JSON.stringify({ ok: true }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "auto_retry_stale") {
      const job_id = body.job_id;
      const thresholdMs = Math.max(30_000, Number(body.threshold_ms) || 60_000);
      if (!job_id) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: jobRow } = await admin.from("bulk_college_jobs")
        .select("id,status,rows,updated_at,paused").eq("id", job_id).maybeSingle();
      if (!jobRow) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const cutoff = Date.now() - thresholdMs;
      const rows: any[] = Array.isArray(jobRow.rows) ? jobRow.rows : [];
      let rowsRequeued = 0;
      for (const r of rows) {
        if (r.status !== "processing") continue;
        const started = r.attemptStartedAt ? Date.parse(r.attemptStartedAt) : 0;
        const staleByJob = jobRow.updated_at ? Date.parse(jobRow.updated_at) < cutoff : false;
        if (!started || started < cutoff || staleByJob) {
          r.status = "pending";
          r.step = "requeued by Retry Stuck";
          r.error = undefined;
          r.attemptStartedAt = undefined;
          rowsRequeued++;
        }
      }

      const pendingRows = rows.filter((r) => r.status === "pending").length;
      await admin.from("bulk_college_jobs").update({
        rows,
        status: pendingRows > 0 ? "running" : jobRow.status,
        paused: false,
        current_activity: rowsRequeued > 0
          ? `Retry Stuck: re-queued ${rowsRequeued} stale college row(s)`
          : `Retry Stuck: no stale rows, worker resumed with ${pendingRows} pending row(s)`,
        updated_at: new Date().toISOString(),
      }).eq("id", job_id);

      if (pendingRows > 0) {
        EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/bulk-college-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader || `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
            "x-worker-key": SERVICE_ROLE,
          },
          body: JSON.stringify({ action: "resume", job_id }),
        }).catch((e) => console.error("Failed to resume after college auto-retry", e)));
      }

      return new Response(JSON.stringify({
        ok: true,
        rows_requeued: rowsRequeued,
        pending_rows: pendingRows,
        threshold_seconds: Math.round(thresholdMs / 1000),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
