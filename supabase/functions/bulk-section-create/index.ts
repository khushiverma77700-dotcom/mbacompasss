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

const COLLEGE_CONCURRENCY = 1;
const AI_SECTION_MAX_ATTEMPTS = 3;
const AI_SECTION_RETRY_BASE_DELAY_MS = 2500;
const SECTION_PAUSE_MS = 1200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-college-section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    const txt = await res.text();
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
) {
  const persist = async () => {
    const stepsDone = rowsRef.value.reduce(
      (acc, r) => acc + r.steps.filter(s => s.status === "succeeded" || s.status === "failed").length,
      0,
    );
    const succeeded = rowsRef.value.filter(r => r.status === "succeeded").length;
    const failed = rowsRef.value.filter(r => r.status === "failed").length;
    const not_found = rowsRef.value.filter(r => r.status === "not_found").length;
    await admin.from("bulk_section_jobs").update({
      rows: rowsRef.value,
      steps_done: stepsDone,
      succeeded,
      failed,
      not_found,
      current_activity: `Row ${row.index + 1}: ${row.inputName} — ${row.status}`,
    }).eq("id", job_id);
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

    // Ensure all section rows exist for this college (track fresh inserts)
    const { data: existingRows } = await admin
      .from("college_sections").select("id, section_type")
      .eq("college_id", college.id);
    const existingTypes = new Set((existingRows || []).map((r: any) => r.section_type));
    const missing = SECTION_TYPES.filter(s => !existingTypes.has(s.value));
    if (missing.length) {
      const inserts = missing.map((t, i) => ({
        college_id: college.id, section_type: t.value, title: t.label,
        sort_order: ((existingRows?.length || 0) + i) * 10, data: {},
      }));
      const { data: insertedRows } = await admin
        .from("college_sections").insert(inserts).select("id");
      freshlyInsertedIds = (insertedRows || []).map((r: any) => r.id);
    }
    const { data: allRows } = await admin
      .from("college_sections").select("id, section_type, title, content, data")
      .eq("college_id", college.id);
    const byType: Record<string, any> = {};
    (allRows || []).forEach((r: any) => { byType[r.section_type] = r; });

    // Generate each section sequentially for this college
    for (let i = 0; i < row.steps.length; i++) {
      if (cancelFlag.v) { await cleanupOnCancel(); return; }

      const step = row.steps[i];
      step.status = "processing";
      rowsRef.value = [...rowsRef.value];
      await persist();

      try {
        const sec = await generateOneSection(authHeader, college, step.type, anchorFacts, cancelFlag);
        // Re-check after the (potentially long) AI call — discard result if cancelled
        if (cancelFlag.v) { await cleanupOnCancel(); return; }
        const target = byType[step.type];
        if (target) {
          await admin.from("college_sections").update({
            title: sec.title || target.title,
            content: sec.content || target.content,
            data: sec.data || {},
          }).eq("id", target.id);
          // This row now has content — protect from cleanup
          freshlyInsertedIds = freshlyInsertedIds.filter(id => id !== target.id);
        }
        step.status = "succeeded";
      } catch (e: any) {
        step.status = "failed";
        step.error = e?.message || "Unknown error";
      }
      rowsRef.value = [...rowsRef.value];
      await persist();
      // small pause to avoid burst rate-limits
      await sleep(SECTION_PAUSE_MS);
    }

    const anyFailed = row.steps.some(s => s.status === "failed");
    row.status = anyFailed ? "failed" : "succeeded";
    if (anyFailed) row.error = `${row.steps.filter(s => s.status === "failed").length} section(s) failed`;
    row.finishedAt = new Date().toISOString();
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

  const rows = job.rows as RowState[];
  const rowsRef = { value: rows };

  await admin.from("bulk_section_jobs").update({
    status: "running",
    started_at: new Date().toISOString(),
    current_activity: "Starting…",
  }).eq("id", job_id);

  const eligible = rows.filter(r => r.status === "pending");

  // Background poller — sets cancelFlag.v immediately when admin cancels
  const cancelFlag = { v: false };
  let pollerStop = false;
  const poller = (async () => {
    while (!pollerStop && !cancelFlag.v) {
      const { data: cur } = await admin.from("bulk_section_jobs")
        .select("status").eq("id", job_id).maybeSingle();
      if (cur?.status === "cancelled") { cancelFlag.v = true; break; }
      await new Promise(r => setTimeout(r, 1500));
    }
  })();

  let cursor = 0;
  const workers = Array.from({ length: COLLEGE_CONCURRENCY }, async () => {
    while (true) {
      if (cancelFlag.v) return;
      const myIdx = cursor++;
      if (myIdx >= eligible.length) return;
      await processCollege(admin, authHeader, job_id, rowsRef, eligible[myIdx], cancelFlag);
    }
  });
  await Promise.all(workers);
  pollerStop = true;
  await poller.catch(() => {});

  if (cancelFlag.v) {
    // Mark any still-pending rows as cancelled too (workers exited before reaching them)
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
    await admin.from("bulk_section_jobs").update({
      rows: rowsRef.value,
      status: "cancelled",
      finished_at: new Date().toISOString(),
      current_activity: "Cancelled by admin",
    }).eq("id", job_id);
    return;
  }

  await admin.from("bulk_section_jobs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    current_activity: "All done",
  }).eq("id", job_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action || "create";

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
      EdgeRuntime.waitUntil(runJob(job_id, authHeader));
      return new Response(JSON.stringify({ ok: true }), {
        status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
