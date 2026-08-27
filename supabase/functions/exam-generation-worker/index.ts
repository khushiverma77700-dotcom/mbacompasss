// Exam Generation Worker — drains public.exam_generation_jobs in the background.
// Kicked right after a job is queued and by cron; survives a closed browser.
// For each job it calls ai-exam-writer once per module group, streaming progress
// (step, steps_done, log, tokens) back onto the job row so the admin console can
// show a live view.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LOCK_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const NEXT_HOP_DELAY_MS = 2_000;
// How many exams may generate at the same time (fan-out of parallel workers).
const DEFAULT_CONCURRENCY = 12;
const MAX_CONCURRENCY = 15;

const BATCHES = [
  { key: "core", label: "Hero, Quick Answer, Highlights, Dates, Overview, Eligibility, Registration & Fees" },
  { key: "exam", label: "Pattern, Marking, Syllabus, Resources, Papers, Difficulty & Preparation" },
  { key: "outcomes", label: "Cutoffs, Colleges, Comparisons, Counselling, Admit Card, Exam Day & Result" },
  { key: "discovery", label: "Related exams, Updates, FAQs & SEO metadata" },
] as const;

async function appendLog(sb: any, jobId: string, entry: Record<string, unknown>) {
  const { data } = await sb.from("exam_generation_jobs").select("log").eq("id", jobId).maybeSingle();
  const log = Array.isArray(data?.log) ? data.log : [];
  log.push({ at: new Date().toISOString(), ...entry });
  await sb.from("exam_generation_jobs").update({ log }).eq("id", jobId);
}

/**
 * Atomically claim the next job. Uses a SECURITY DEFINER RPC backed by
 * FOR UPDATE SKIP LOCKED so 10-15 parallel workers never grab the same exam.
 */
async function claimJob(sb: any) {
  const { data, error } = await sb.rpc("claim_exam_generation_job", {
    _lock_minutes: LOCK_MINUTES,
    _max_attempts: MAX_ATTEMPTS,
  });
  if (error) throw new Error(`claim failed: ${error.message}`);
  const job = Array.isArray(data) ? data[0] : data;
  return job || null;
}

async function pendingCount(sb: any) {
  const { count } = await sb
    .from("exam_generation_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"])
    .lt("attempts", MAX_ATTEMPTS);
  return count ?? 0;
}

async function invokeWorker(body: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, NEXT_HOP_DELAY_MS));
  const response = await fetch(`${SUPABASE_URL}/functions/v1/exam-generation-worker`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-worker-key": SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`worker continuation ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response;
}


async function callWriter(payload: Record<string, unknown>) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-exam-writer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-worker-key": SERVICE_KEY,
    },
    body: JSON.stringify(payload),
  });
  const raw = await resp.text();
  if (!resp.ok) throw new Error(`ai-exam-writer ${resp.status}: ${raw.slice(0, 300)}`);
  let data: any;
  try {
    // The writer streams whitespace heartbeats before the JSON payload.
    data = JSON.parse(raw.trim());
  } catch {
    throw new Error(`ai-exam-writer returned invalid JSON: ${raw.slice(0, 200)}`);
  }
  if (data?.error) throw new Error(`ai-exam-writer: ${String(data.error).slice(0, 300)}`);
  return data;
}

/**
 * Process exactly one durable stage per invocation. A full exam can take many
 * minutes, which exceeds the edge runtime when all stages run in one request.
 * Every successful stage checkpoints its result and releases the lease before
 * a later worker claims the next stage.
 */
async function runJobStage(sb: any, job: any): Promise<boolean> {
  const existing = (job.result && typeof job.result === "object" ? job.result : {}) as any;
  const sections: Record<string, any> = existing.sections && typeof existing.sections === "object" ? { ...existing.sections } : {};
  let research = existing.research ?? undefined;
  let sources: any[] = Array.isArray(job.sources) ? job.sources : [];
  let tokens = job.tokens_used ?? 0;
  const doneBatches: string[] = Array.isArray(existing.done_batches) ? existing.done_batches : [];

  // Research runs as its own short call so no single invocation has to crawl
  // sources AND generate content (that was hitting the 150s idle timeout).
  if (!research) {
    await sb.from("exam_generation_jobs").update({ step: "Researching official sources" }).eq("id", job.id);
    await appendLog(sb, job.id, { level: "info", step: "research", message: "Researching official sources" });
    const r = await callWriter({
      stage: "research",
      exam_name: job.exam_name,
      exam_year: job.exam_year,
      official_website: job.official_website,
    });
    research = r.research;
    if (Array.isArray(r.sources)) {
      const seen = new Set(sources.map((s: any) => s.url));
      for (const s of r.sources) if (!seen.has(s.url)) { sources.push(s); seen.add(s.url); }
    }
    await sb.from("exam_generation_jobs").update({
      sources,
      result: { sections, research, done_batches: doneBatches },
      worker_lock_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
    }).eq("id", job.id);
    await appendLog(sb, job.id, { level: "success", step: "research", message: `Research done — ${sources.length} official sources` });
    await sb.from("exam_generation_jobs").update({
      status: "queued",
      worker_lock_until: null,
      attempts: 0,
    }).eq("id", job.id);
    return false;
  }

  for (const batch of BATCHES) {
    if (doneBatches.includes(batch.key)) continue;

    await sb.from("exam_generation_jobs").update({ step: batch.label }).eq("id", job.id);
    await appendLog(sb, job.id, { level: "info", step: batch.key, message: `Generating: ${batch.label}` });

    const data = await callWriter({
      exam_name: job.exam_name,
      exam_year: job.exam_year,
      official_website: job.official_website,
      exam_category: job.exam_category,
      notes: job.notes,
      batches: [batch.key],
      max_repair_passes: 1,
      ...(research ? { research } : {}),
    });

    Object.assign(sections, data.sections || {});
    if (!research && data.research) research = data.research;
    if (Array.isArray(data.sources) && data.sources.length) {
      const seen = new Set(sources.map((s: any) => s.url));
      for (const s of data.sources) if (!seen.has(s.url)) { sources.push(s); seen.add(s.url); }
    }
    tokens += data.tokens_used ?? 0;
    doneBatches.push(batch.key);


    const generated = Object.keys(data.sections || {}).filter((k) => {
      const v = (data.sections || {})[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    const cov = (data.coverage || {})[batch.key] || {};
    const covGaps: string[] = Array.isArray(cov.gaps) ? cov.gaps : [];
    await appendLog(sb, job.id, {
      level: (data.errors || []).length || covGaps.length ? "warn" : "success",
      step: batch.key,
      message: `Done: ${generated.join(", ") || "no content returned"}${
        cov.passes ? ` · AI passes: ${cov.passes}` : ""
      }${covGaps.length ? ` · still thin: ${covGaps.join(", ")}` : " · all modules complete"}`,
      errors: [...(data.errors || []), ...(covGaps.length ? [`incomplete modules: ${covGaps.join(", ")}`] : [])],
      tokens: data.tokens_used ?? 0,
    });


    await sb.from("exam_generation_jobs").update({
      steps_done: doneBatches.length,
      steps_total: BATCHES.length,
      tokens_used: tokens,
      sources,
      result: { sections, research, done_batches: doneBatches },
      worker_lock_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
    }).eq("id", job.id);
    await sb.from("exam_generation_jobs").update({
      status: "queued",
      worker_lock_until: null,
      attempts: 0,
    }).eq("id", job.id);
    return false;
  }

  let publishedSlug: string | null = null;
  if (job.auto_publish) {
    await sb.from("exam_generation_jobs").update({ step: "Publishing exam page" }).eq("id", job.id);
    publishedSlug = await publishExam(sb, job, sections, sources);
    await appendLog(sb, job.id, { level: "success", message: `Published /exam/${publishedSlug}` });
  }

  await sb.from("exam_generation_jobs").update({
    status: job.auto_publish ? "published" : "completed",
    step: job.auto_publish ? `Published /exam/${publishedSlug}` : "Ready for review",
    finished_at: new Date().toISOString(),
    worker_lock_until: null,
    result: { sections, research, done_batches: doneBatches },
    sources,
    tokens_used: tokens,
    published_slug: publishedSlug,
    error: null,
  }).eq("id", job.id);

  if (!job.auto_publish) {
    await appendLog(sb, job.id, { level: "success", message: "Generation complete — open the review editor to publish." });
  }
  return true;
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

/** Server-side publish so bulk CSV batches go live without a browser open. */
async function publishExam(sb: any, job: any, sections: Record<string, any>, sources: any[]) {
  const hero = sections.hero || {};
  const seo = sections.seo || {};
  const examName: string = job.exam_name;
  const examYear: number | null = job.exam_year ?? null;
  const slug = slugify(examName);
  const dates: any[] = Array.isArray(sections.dates) ? sections.dates : [];

  const payload: Record<string, any> = {
    name: examName,
    slug,
    full_name: hero.full_form || examName,
    description: sections.overview || null,
    conducting_body: hero.conducting_body || null,
    frequency: hero.frequency || null,
    duration: hero.duration || null,
    exam_mode: hero.exam_mode || null,
    exam_level: hero.exam_level || null,
    exam_category: job.exam_category || hero.exam_category || null,
    exam_status: hero.exam_status || null,
    registration_status: hero.registration_status || null,
    official_website: job.official_website || hero.official_website || null,
    exam_year: examYear,
    eligibility: sections.eligibility?.summary || null,
    exam_date: dates.find((d) => /exam(ination)?\b/i.test(d?.event || ""))?.date || null,
    registration_deadline:
      dates.find((d) => /registration end|last date|registration close/i.test(d?.event || ""))?.date || null,
    important_dates: dates.length ? dates : null,
    pattern: sections.pattern || null,
    cutoffs: sections.cutoffs || null,
    faqs: Array.isArray(sections.faqs) && sections.faqs.length ? sections.faqs : null,
    syllabus: Array.isArray(sections.syllabus) && sections.syllabus.length
      ? sections.syllabus.map((s: any) => s?.subject || "").filter(Boolean)
      : null,
    meta_title: seo.meta_title || `${examName}${examYear ? ` ${examYear}` : ""}: Dates, Syllabus, Pattern, Eligibility & Cutoff`,
    meta_description: seo.meta_description || null,
    h1_tag: seo.h1 || `${examName}${examYear ? ` ${examYear}` : ""}`,
    primary_keyword: seo.primary_keyword || null,
    keywords: Array.isArray(seo.keywords) && seo.keywords.length ? seo.keywords : null,
    reviewed_by: "MBA Compass Editorial Team",
    ...(job.sort_order === null || job.sort_order === undefined ? {} : { listing_sort_order: job.sort_order }),
    sources: sources?.length ? sources : null,
    sections,
    updated_at: new Date().toISOString(),
    last_seo_refresh: new Date().toISOString(),
  };

  const { data: existing } = await sb.from("exams").select("id").eq("slug", slug).maybeSingle();
  const examId = job.exam_id || existing?.id || null;
  if (examId) {
    const { error } = await sb.from("exams").update(payload).eq("id", examId);
    if (error) throw new Error(`publish failed: ${error.message}`);
    await sb.from("exam_generation_jobs").update({ exam_id: examId }).eq("id", job.id);
  } else {
    const { data, error } = await sb.from("exams").insert(payload).select("id").single();
    if (error) throw new Error(`publish failed: ${error.message}`);
    await sb.from("exam_generation_jobs").update({ exam_id: data.id }).eq("id", job.id);
  }
  return slug;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  let processed = 0;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  try {
    // ---- Dispatcher mode (default entry point) ----------------------------
    // Fans the queue out across up to MAX_CONCURRENCY parallel worker
    // invocations so a 30-exam batch runs ~12 at a time instead of one by one.
    if (!body?.worker) {
      const pending = await pendingCount(sb);
      const requested = Number(body?.concurrency) || DEFAULT_CONCURRENCY;
      const lanes = Math.max(0, Math.min(pending, MAX_CONCURRENCY, Math.max(1, requested)));
      for (let i = 0; i < lanes; i++) {
        EdgeRuntime.waitUntil(
          invokeWorker({ worker: true, lane: i, budget: 8 }).catch((e) =>
            console.error("worker dispatch failed", e instanceof Error ? e.message : String(e))
          ),
        );
      }
      return new Response(JSON.stringify({ mode: "dispatch", pending, workers_started: lanes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Worker lane -----------------------------------------------------
    const budget = Math.max(1, Math.min(8, Number(body?.budget) || 8));
    const job = await claimJob(sb);
    if (job) {
      try {
        await runJobStage(sb, job);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const failed = (job.attempts ?? 0) + 1 >= MAX_ATTEMPTS;
        await sb.from("exam_generation_jobs").update({
          status: failed ? "failed" : "queued",
          error: msg.slice(0, 800),
          worker_lock_until: null,
          ...(failed ? { finished_at: new Date().toISOString() } : {}),
        }).eq("id", job.id);
        await appendLog(sb, job.id, { level: "error", message: msg.slice(0, 500) });
      }
      processed++;
    }

    // Continue only while work remains and this chain still has budget. The
    // cron watchdog starts a fresh bounded chain every minute as a safety net.
    const pending = await pendingCount(sb);
    if (pending > 0 && budget > 1) {
      EdgeRuntime.waitUntil(
        invokeWorker({ worker: true, lane: body?.lane ?? 0, budget: budget - 1 }).catch((e) =>
          console.error("worker continuation failed", e instanceof Error ? e.message : String(e))
        ),
      );
    }

    return new Response(JSON.stringify({ mode: "worker", processed, pending }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
