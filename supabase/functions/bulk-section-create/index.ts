// Bulk College Sections Generator — background worker.
// Accepts a list of college names (one per line), matches each to an existing
// college (case-insensitive, ignores leading/trailing spaces, skips dupes),
// and for every matched college generates ALL section types via ai-college-section
// using the same per-section pipeline as the manual "Generate ALL via AI" flow.
//
// Runs in the background via EdgeRuntime.waitUntil so the request returns immediately
// and the job continues even if the admin closes the tab.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const COLLEGE_CONCURRENCY = 1;
const AI_SECTION_MAX_ATTEMPTS = 1;
const AI_SECTION_RETRY_BASE_DELAY_MS = 2500;
const SECTION_PAUSE_MS = 1200;
const ROWS_PER_INVOCATION = 10;
const AI_SECTION_TIMEOUT_MS = 110_000;
const STALE_PROCESSING_MS = 4 * 60_000;

const LOCK_MS = 3 * 60_000;
const TELEMETRY_LIMIT = 100;

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
      timeline: Array.isArray(initial?.timeline) ? initial.timeline.slice(-TELEMETRY_LIMIT) : [],
      events: Array.isArray(initial?.events) ? initial.events.slice(-12) : [],
    };
  }

  incDbWrite(n = 1) { this.state.db.writes += n; }
  setActive(n: number) {
    this.state.activeWorkers = n;
    this.state.peakActiveWorkers = Math.max(this.state.peakActiveWorkers || 0, n);
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
    if (status >= 200 && status < 400) n.success += 1; else n.failed += 1;
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

async function fetchWithTimeoutAndCancel(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  cancelFlag?: { v: boolean },
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
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

const isRetryableAISectionFailure = (status: number, text: string) =>
  status === 408 || status === 429 || status >= 500 ||
  /malformed json|unterminated string|unexpected end|truncated|ai generation failed|empty section|did not return a structured/i.test(text);

const SECTION_TYPES: { value: string; label: string }[] = [
  { value: "courses_fees", label: "Courses & Fee Structure" },
  { value: "admission", label: "Admission Process" },
  { value: "placements", label: "Placement Statistics" },
  { value: "cutoff", label: "Cutoff Details" },
  { value: "rankings", label: "Rankings & Accreditations" },
  { value: "reviews", label: "Student Reviews" },
  { value: "gallery", label: "Campus Gallery" },
  { value: "scholarships", label: "Scholarships" },
  { value: "faculty", label: "Faculty Profiles" },
  { value: "hostel", label: "Hostel & Campus Life" },
  { value: "qa", label: "Frequently Asked Questions" },
  { value: "quick_info", label: "Quick Info / Sidebar" },
  { value: "why_join", label: "Why Join (Ratings)" },
  { value: "news", label: "Latest News & Articles" },
];

interface SectionStep {
  type: string;
  label: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  error?: string;
  startedAt?: string;
}

interface RowState {
  index: number;
  inputName: string;
  collegeId?: string;
  matchedName?: string;
  status: "pending" | "processing" | "matched" | "not_found" | "succeeded" | "failed";
  error?: string;
  steps: SectionStep[];
  startedAt?: string;
  finishedAt?: string;
}

async function generateOneSection(
  authHeader: string,
  college: any,
  sectionType: string,
  anchorFacts: any,
  cancelFlag?: { v: boolean },
  tracker?: TelemetryTracker,
) {
  const cy = new Date().getFullYear();
  const body = {
    collegeId: college.id,
    collegeName: college.name,
    city: college.city,
    state: college.state,
    type: college.type,
    tier: college.tier,
    established: college.established,
    sectionType,
    anchorFacts,
    factSafety: true,
    freshnessWindow: `${cy - 1}-${cy + 1}`,
  };

  let lastError = "";
  for (let attempt = 1; attempt <= AI_SECTION_MAX_ATTEMPTS; attempt++) {
    if (cancelFlag?.v) throw new Error("Cancelled by admin");
      let res: Response;
      const requestBody = JSON.stringify(body);
      const started = Date.now();
      try {
        res = await fetchWithTimeoutAndCancel(`${SUPABASE_URL}/functions/v1/ai-college-section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: ANON_KEY,
      },
      body: requestBody,
        }, AI_SECTION_TIMEOUT_MS, cancelFlag);
      } catch (err) {
        tracker?.recordHttp("ai-college-section", 0, textBytes(requestBody), 0, Date.now() - started);
        if (cancelFlag?.v) throw new Error("Cancelled by admin");
        lastError = err instanceof DOMException && err.name === "AbortError"
          ? `AI section timed out after ${Math.round(AI_SECTION_TIMEOUT_MS / 1000)}s`
          : `AI section request failed: ${err instanceof Error ? err.message : String(err)}`;
        if (attempt < AI_SECTION_MAX_ATTEMPTS) {
          await sleep(AI_SECTION_RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        break;
      }

    const txt = await res.text();
    tracker?.recordHttp("ai-college-section", res.status, textBytes(requestBody), textBytes(txt), Date.now() - started);
    if (res.ok) {
      try {
        const data = JSON.parse(txt);
        if (data?.error) throw new Error(data.error);
        if (!data?.section) throw new Error("AI returned empty section");
        return data.section as { title: string | null; content: string; data: any };
      } catch (e: any) {
        lastError = e?.message || "AI section returned invalid response JSON";
      }
    } else {
      lastError = `AI section failed (${res.status}): ${txt.slice(0, 300)}`;
      if (!isRetryableAISectionFailure(res.status, txt)) break;
    }

    if (attempt < AI_SECTION_MAX_ATTEMPTS) {
      await sleep(AI_SECTION_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw new Error(lastError || "AI section failed after retries");
}

async function processCollege(
  admin: any,
  authHeader: string,
  job_id: string,
  rowsRef: { value: RowState[] },
  row: RowState,
  cancelFlag: { v: boolean },
  tracker: TelemetryTracker,
  workerId: string,
) {
  const persist = async () => {
    const stepsDone = rowsRef.value.reduce(
      (acc, r) => acc + r.steps.filter(s => s.status === "succeeded" || s.status === "failed").length,
      0,
    );
    const succeeded = rowsRef.value.filter(r => r.status === "succeeded").length;
    const failed = rowsRef.value.filter(r => r.status === "failed").length;
    const not_found = rowsRef.value.filter(r => r.status === "not_found").length;
    await updateBulkJob(admin, "bulk_section_jobs", job_id, workerId, tracker, {
      rows: rowsRef.value,
      steps_done: stepsDone,
      succeeded,
      failed,
      not_found,
      current_activity: `Row ${row.index + 1}: ${row.inputName} — ${row.status}`,
    });
  };

  // Track which section rows were freshly inserted by THIS job for this college,
  // so we can clean them up if cancelled (don't leave empty placeholders).
  let freshlyInsertedIds: string[] = [];
  const cleanupOnCancel = async () => {
    // Mark in-progress / pending steps as cancelled
    for (const s of row.steps) {
      if (s.status === "processing" || s.status === "pending") {
        s.status = "failed";
        s.error = "Cancelled";
      }
    }
    row.status = "failed";
    row.error = "Cancelled by admin";
    row.finishedAt = new Date().toISOString();
    // Delete any freshly inserted (empty) section placeholders
    if (freshlyInsertedIds.length) {
      tracker.incDbWrite();
      await admin.from("college_sections").delete().in("id", freshlyInsertedIds);
    }
    rowsRef.value = [...rowsRef.value];
    await persist();
  };

  try {
    if (cancelFlag.v) { await cleanupOnCancel(); return; }

    row.status = "processing";
    row.startedAt = new Date().toISOString();
    rowsRef.value = [...rowsRef.value];
    await persist();

    // Fetch college full row
    const { data: college, error: cErr } = await admin
      .from("colleges")
      .select("id, name, city, state, type, tier, established, ranking, fees, fees_lakhs, placement_avg, placement_highest, placement_median, exams_accepted, accreditations")
      .eq("id", row.collegeId!)
      .maybeSingle();
    if (cErr || !college) throw new Error("College row not found");

    const cy = new Date().getFullYear();
    const anchorFacts = {
      established: college.established,
      ranking: college.ranking,
      fees: college.fees,
      fees_lakhs: college.fees_lakhs,
      placement_avg: college.placement_avg,
      placement_highest: college.placement_highest,
      placement_median: college.placement_median,
      exams_accepted: college.exams_accepted,
      accreditations: college.accreditations,
      admission_cycle: `${cy}-${cy + 1}`,
    };

    if (cancelFlag.v) { await cleanupOnCancel(); return; }

    while (row.steps.some((s) => s.status === "pending") && !cancelFlag.v) {
      const step = row.steps.find((s) => s.status === "pending");
      if (!step) break;

    // PRESERVATION MODEL: never modify the original section row.
    // AI content is written to a separate row with version='ai_v1'.
    // We look up an existing AI version (to update) or create a fresh one — the
    // original (version='original') row stays untouched so SEO/indexed content remains intact.
    const { data: originalRow } = await admin
      .from("college_sections")
      .select("id, section_type, title, content, data, sort_order")
      .eq("college_id", college.id)
      .eq("section_type", step.type)
      .eq("version", "original")
      .maybeSingle();
    const { data: aiRow } = await admin
      .from("college_sections")
      .select("id, title, content, data, sort_order")
      .eq("college_id", college.id)
      .eq("section_type", step.type)
      .eq("version", "ai_v1")
      .maybeSingle();

    if (cancelFlag.v) { await cleanupOnCancel(); return; }
    step.status = "processing";
    step.startedAt = new Date().toISOString();
    rowsRef.value = [...rowsRef.value];
    await persist();

    try {
      const sec = await generateOneSection(authHeader, college, step.type, anchorFacts, cancelFlag, tracker);
      if (cancelFlag.v) { await cleanupOnCancel(); return; }

      const orderIndex = SECTION_TYPES.findIndex((s) => s.value === step.type);
      const sortBase = (originalRow?.sort_order ?? Math.max(orderIndex, 0) * 10);

      if (aiRow?.id) {
        // Update the existing AI version only — original row is never touched
        tracker.incDbWrite();
        await admin.from("college_sections").update({
          title: sec.title || aiRow.title,
          content: sec.content || aiRow.content,
          data: sec.data || {},
          is_active: true,
          source: "ai",
        }).eq("id", aiRow.id);
      } else {
        tracker.incDbWrite();
        const { data: insertedAi } = await admin
          .from("college_sections")
          .insert({
            college_id: college.id,
            section_type: step.type,
            title: sec.title || step.label,
            content: sec.content || null,
            data: sec.data || {},
            sort_order: sortBase + 1, // render right after original
            version: "ai_v1",
            is_active: true,
            source: "ai",
            parent_section_id: originalRow?.id || null,
          })
          .select("id")
          .single();
        if (insertedAi?.id) freshlyInsertedIds = [insertedAi.id];
      }
      step.status = "succeeded";
      step.startedAt = undefined;
    } catch (e: any) {
      step.status = "failed";
      step.error = e?.message || "Unknown error";
      step.startedAt = undefined;
    }
      rowsRef.value = [...rowsRef.value];
      await persist();
      await sleep(SECTION_PAUSE_MS);
    }

    const remainingSteps = row.steps.some(s => s.status === "pending");
    const anyFailed = row.steps.some(s => s.status === "failed");
    row.status = remainingSteps ? "pending" : anyFailed ? "failed" : "succeeded";
    if (!remainingSteps) row.finishedAt = new Date().toISOString();
    if (anyFailed && !remainingSteps) row.error = `${row.steps.filter(s => s.status === "failed").length} section(s) failed`;

  } catch (e: any) {
    row.status = "failed";
    row.error = e?.message || "Unknown error";
    row.finishedAt = new Date().toISOString();
  }
  rowsRef.value = [...rowsRef.value];
  await persist();
}

async function runJob(job_id: string, authHeader: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: job, error } = await admin
    .from("bulk_section_jobs").select("*").eq("id", job_id).maybeSingle();
  if (error || !job) {
    console.error("bulk-section job not found", job_id, error);
    return;
  }
  if (["completed", "cancelled"].includes(job.status)) return;
  if ((job as any).paused) {
    await admin.from("bulk_section_jobs").update({ status: "pending", current_activity: "Paused — waiting for admin resume", updated_at: new Date().toISOString() }).eq("id", job_id);
    return;
  }

  const workerId = crypto.randomUUID();
  const claimed = await claimWorkerLock(admin, "bulk_section_jobs", job_id, workerId);
  if (!claimed) {
    console.log("bulk section worker already active", job_id);
    return;
  }
  const tracker = new TelemetryTracker((job as any).telemetry, workerId);

  try {
    const rows = (job.rows as RowState[]).map((r) => {
      if (r.status !== "processing") return r;
      const processingStep = (r.steps || []).find((s) => s.status === "processing");
      const started = processingStep?.startedAt || r.startedAt;
      const startedAtMs = started ? new Date(started).getTime() : 0;
      const isStale = !startedAtMs || Date.now() - startedAtMs > STALE_PROCESSING_MS;
      if (!isStale) return r;
      return {
        ...r,
        status: "pending" as const,
        error: undefined,
        steps: (r.steps || []).map((s) => s.status === "processing"
          ? { ...s, status: "pending" as const, error: undefined, startedAt: undefined }
          : s),
      };
    });
    const rowsRef = { value: rows };

    await updateBulkJob(admin, "bulk_section_jobs", job_id, workerId, tracker, {
      status: "running",
      started_at: job.started_at || new Date().toISOString(),
      rows,
      current_activity: "Worker claimed queue…",
    });

    const eligible = rows
      .filter(r => r.status === "pending" && (r.steps || []).some((s) => s.status === "pending"))
      .sort((a, b) => a.index - b.index)
      .slice(0, ROWS_PER_INVOCATION);

    const cancelFlag = { v: false };
    const pauseFlag = { v: false };
    const concurrencyRef = { v: Math.max(1, Math.min(10, Number((job as any).concurrency) || 1)) };
    let pollerStop = false;
    const poller = (async () => {
      while (!pollerStop && !cancelFlag.v) {
        const { data: cur } = await admin.from("bulk_section_jobs")
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
    const slots = Math.max(1, Math.min(10, concurrencyRef.v));
    const workers = Array.from({ length: slots }, async (_, slotIdx) => {
      while (true) {
        if (cancelFlag.v || pauseFlag.v) return;
        if (slotIdx >= concurrencyRef.v) return;
        const myIdx = cursor++;
        if (myIdx >= eligible.length) return;
        activeRef.n += 1;
        tracker.setActive(activeRef.n);
        const busyStarted = Date.now();
        try {
          await processCollege(admin, authHeader, job_id, rowsRef, eligible[myIdx], cancelFlag, tracker, workerId);
          const stepsDoneNow = rowsRef.value.reduce((acc, r) => acc + (r.steps || []).filter(s => s.status === "succeeded" || s.status === "failed").length, 0);
          tracker.recordProgress(stepsDoneNow, eligible[myIdx].matchedName || eligible[myIdx].inputName);
        } finally {
          tracker.addBusy(Date.now() - busyStarted);
          activeRef.n = Math.max(0, activeRef.n - 1);
          tracker.setActive(activeRef.n);
        }
      }
    });
    await Promise.all(workers);
    pollerStop = true;
    await poller.catch(() => {});

    const succeeded = rowsRef.value.filter(r => r.status === "succeeded").length;
    const failed = rowsRef.value.filter(r => r.status === "failed").length;
    const not_found = rowsRef.value.filter(r => r.status === "not_found").length;
    const steps_done = rowsRef.value.reduce(
      (acc, r) => acc + (r.steps || []).filter(s => s.status === "succeeded" || s.status === "failed").length,
      0,
    );

    if (cancelFlag.v) {
      for (const r of rowsRef.value) {
        if (r.status === "pending" || r.status === "processing") {
          r.status = "failed";
          r.error = "Cancelled by admin";
          for (const s of r.steps) {
            if (s.status === "pending" || s.status === "processing") {
              s.status = "failed"; s.error = "Cancelled";
            }
          }
        }
      }
      await releaseWorkerLock(admin, "bulk_section_jobs", job_id, workerId, tracker, {
        rows: rowsRef.value,
        status: "cancelled",
        finished_at: new Date().toISOString(),
        current_activity: "Cancelled by admin",
      });
      return;
    }

    const { data: latest } = await admin.from("bulk_section_jobs")
      .select("paused,status").eq("id", job_id).maybeSingle();
    if ((latest as any)?.paused) {
      await releaseWorkerLock(admin, "bulk_section_jobs", job_id, workerId, tracker, {
        status: "pending",
        rows: rowsRef.value,
        steps_done,
        succeeded,
        failed,
        not_found,
        current_activity: "Paused — worker parked safely",
      });
      return;
    }

    const remaining = rowsRef.value.filter(r => r.status === "pending" && (r.steps || []).some(s => s.status === "pending")).length;

    if (remaining > 0) {
      await releaseWorkerLock(admin, "bulk_section_jobs", job_id, workerId, tracker, {
        status: "pending",
        rows: rowsRef.value,
        steps_done,
        succeeded,
        failed,
        not_found,
        current_activity: `Continuing… ${remaining} college(s) remaining`,
      });

      EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/bulk-section-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: ANON_KEY,
          "x-worker-key": SERVICE_ROLE,
        },
        body: JSON.stringify({ action: "resume", job_id }),
      }).catch((e) => console.error("Failed to schedule next bulk section chunk", e)));
      return;
    }

    await releaseWorkerLock(admin, "bulk_section_jobs", job_id, workerId, tracker, {
      status: "completed",
      finished_at: new Date().toISOString(),
      rows: rowsRef.value,
      steps_done,
      succeeded,
      failed,
      not_found,
      current_activity: "All done",
    });
  } catch (err) {
    console.error("bulk section runJob failed", err);
    await releaseWorkerLock(admin, "bulk_section_jobs", job_id, workerId, tracker, {
      status: "pending",
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
      const { data: { user: authUser } } = await userClient.auth.getUser();
      user = authUser;
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
      const namesRaw: string[] = Array.isArray(body.names) ? body.names : [];
      const cleaned = Array.from(new Set(
        namesRaw.map(n => String(n || "").trim()).filter(n => n.length > 0).map(n => n)
      ));
      if (cleaned.length === 0) {
        return new Response(JSON.stringify({ error: "No college names provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Match by exact name OR case-insensitive name
      const { data: matches } = await admin.from("colleges")
        .select("id, name").in("name", cleaned);
      const byLower: Record<string, { id: string; name: string }> = {};
      (matches || []).forEach((c: any) => { byLower[(c.name || "").toLowerCase()] = c; });

      // For unmatched, do a second pass with ilike one-by-one (cheap, small lists)
      const unmatched = cleaned.filter(n => !byLower[n.toLowerCase()]);
      for (const n of unmatched) {
        const { data: m } = await admin.from("colleges")
          .select("id, name").ilike("name", n).limit(1).maybeSingle();
        if (m) byLower[n.toLowerCase()] = m;
      }

      const rows: RowState[] = cleaned.map((name, i) => {
        const m = byLower[name.toLowerCase()];
        if (!m) {
          return {
            index: i, inputName: name, status: "not_found",
            error: "No matching college found",
            steps: [],
          };
        }
        return {
          index: i, inputName: name, collegeId: m.id, matchedName: m.name,
          status: "pending",
          steps: SECTION_TYPES.map(s => ({ type: s.value, label: s.label, status: "pending" as const })),
        };
      });

      const eligibleRows = rows.filter(r => r.status === "pending");
      const totalSteps = eligibleRows.length * SECTION_TYPES.length;
      const notFound = rows.filter(r => r.status === "not_found").length;

      const { data: job, error: insErr } = await admin.from("bulk_section_jobs").insert({
        created_by: user.id,
        status: "pending",
        total_rows: rows.length,
        total_steps: totalSteps,
        steps_done: 0,
        not_found: notFound,
        rows,
        current_activity: `Queued ${eligibleRows.length} colleges (${notFound} not found)`,
      } as any).select("id").single();
      if (insErr) throw insErr;

      // @ts-ignore
      EdgeRuntime.waitUntil(runJob(job.id, authHeader));

      return new Response(JSON.stringify({
        job_id: job.id,
        total: rows.length,
        eligible: eligibleRows.length,
        not_found: notFound,
        total_steps: totalSteps,
      }), {
        status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resume") {
      const job_id = body.job_id;
      if (!job_id) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: corsHeaders });
      // @ts-ignore
      EdgeRuntime.waitUntil(runJob(job_id, isInternalResume ? `Bearer ${ANON_KEY}` : authHeader));
      return new Response(JSON.stringify({ ok: true }), {
        status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auto_retry_stale") {
      const job_id = body.job_id;
      const thresholdMs = Math.max(30_000, Number(body.threshold_ms) || 60_000);
      if (!job_id) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: jobRow } = await admin.from("bulk_section_jobs")
        .select("id, status, rows, updated_at").eq("id", job_id).maybeSingle();
      if (!jobRow) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const cutoff = Date.now() - thresholdMs;
      const rows: any[] = Array.isArray(jobRow.rows) ? jobRow.rows : [];
      const requeued: { college: string; steps: string[] }[] = [];
      let stepsRequeued = 0;
      let rowsRequeued = 0;

      for (const r of rows) {
        if (r.status === "succeeded" || r.status === "not_found") continue;
        const stuckSteps: string[] = [];
        if (Array.isArray(r.steps)) {
          for (const s of r.steps) {
            if (s.status === "processing") {
              const started = s.startedAt ? Date.parse(s.startedAt) : 0;
              if (!started || started < cutoff) {
                s.status = "pending";
                s.error = undefined;
                s.startedAt = undefined;
                stuckSteps.push(s.label || s.type);
                stepsRequeued++;
              }
            }
          }
        }
        // Row-level stuck (pending/processing with no progress since updated_at)
        const jobUpdated = jobRow.updated_at ? Date.parse(jobRow.updated_at) : 0;
        if ((r.status === "processing" || r.status === "pending") && jobUpdated && jobUpdated < cutoff) {
          r.status = "pending";
          rowsRequeued++;
        }
        if (stuckSteps.length > 0) {
          requeued.push({ college: r.matchedName || r.inputName, steps: stuckSteps });
        }
      }

      if (stepsRequeued === 0 && rowsRequeued === 0) {
        await admin.from("bulk_section_jobs").update({ status: "pending", paused: false, current_activity: "Retry Stuck: no stale items, worker resumed", updated_at: new Date().toISOString() }).eq("id", job_id);
        EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/bulk-section-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader || `Bearer ${ANON_KEY}`, apikey: ANON_KEY, "x-worker-key": SERVICE_ROLE },
          body: JSON.stringify({ action: "resume", job_id }),
        }).catch((e) => console.error("Failed to resume after no-op auto-retry", e)));
        return new Response(JSON.stringify({ ok: true, requeued: [], steps_requeued: 0, rows_requeued: 0, message: "No stale items found; worker resumed" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("bulk_section_jobs").update({
        rows,
        status: "pending",
        paused: false,
        current_activity: `Auto-retry: re-queued ${stepsRequeued} stuck step(s) across ${requeued.length} college(s)`,
        updated_at: new Date().toISOString(),
      }).eq("id", job_id);

      // @ts-ignore
      EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/bulk-section-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
          "x-worker-key": SERVICE_ROLE,
        },
        body: JSON.stringify({ action: "resume", job_id }),
      }).catch((e) => console.error("Failed to resume after auto-retry", e)));

      return new Response(JSON.stringify({
        ok: true,
        requeued,
        steps_requeued: stepsRequeued,
        rows_requeued: rowsRequeued,
        threshold_minutes: Math.round(thresholdMs / 60_000),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("bulk-section-create error", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
