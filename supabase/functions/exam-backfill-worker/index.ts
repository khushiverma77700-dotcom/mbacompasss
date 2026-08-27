// Exam Backfill Worker — completes ALREADY PUBLISHED exam pages.
//
// For every queued item it:
//   1. loads the exam and audits its sections field by field (examCompleteness)
//   2. asks ai-exam-writer (stage: "gapfill") to re-research ONLY the missing
//      facts from official sources and return a patch
//   3. merges + prunes the patch, saves it back onto public.exams and mirrors
//      the key legacy columns, then re-audits and records the result
//
// Safety: DB lease via claim_exam_backfill_item (FOR UPDATE SKIP LOCKED),
// attempt caps, bounded per-invocation budget, gated self-continuation and a
// cron pump from bulk-jobs-watchdog so runs survive a closed browser.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  auditExamSections,
  completenessScore,
  pruneBlankContent,
  type Gap,
} from "../_shared/examCompleteness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LOCK_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const DEFAULT_CONCURRENCY = 8;
const MAX_CONCURRENCY = 12;
const NEXT_HOP_DELAY_MS = 2_000;
/** Gap-fill passes per item per invocation (each pass = 1 AI call per batch). */
const PASSES_PER_RUN = 1;

type Item = {
  id: string;
  job_id: string | null;
  exam_id: string;
  exam_name: string;
  exam_slug: string | null;
  exam_year: number | null;
  official_website: string | null;
  attempts: number;
  passes: number | null;
  gaps_before: number | null;
  tokens_used: number | null;
  research: any;
  log: any;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function appendLog(sb: any, itemId: string, entry: Record<string, unknown>) {
  const { data } = await sb.from("exam_backfill_items").select("log").eq("id", itemId).maybeSingle();
  const log = Array.isArray(data?.log) ? data.log : [];
  log.push({ at: new Date().toISOString(), ...entry });
  await sb.from("exam_backfill_items").update({ log: log.slice(-60) }).eq("id", itemId);
}

async function claimItem(sb: any): Promise<Item | null> {
  const { data, error } = await sb.rpc("claim_exam_backfill_item", {
    _lock_minutes: LOCK_MINUTES,
    _max_attempts: MAX_ATTEMPTS,
  });
  if (error) throw new Error(`claim failed: ${error.message}`);
  const item = Array.isArray(data) ? data[0] : data;
  return (item as Item) || null;
}

async function pendingCount(sb: any) {
  const { count } = await sb
    .from("exam_backfill_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"])
    .lt("attempts", MAX_ATTEMPTS);
  return count ?? 0;
}

async function invokeSelf(body: Record<string, unknown>) {
  await new Promise((r) => setTimeout(r, NEXT_HOP_DELAY_MS));
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/exam-backfill-worker`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-worker-key": SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`continuation ${resp.status}`);
  return resp;
}

async function callGapfill(payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150_000);
  let resp: Response;
  try {
    resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-exam-writer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        "x-worker-key": SERVICE_KEY,
      },
      body: JSON.stringify({ stage: "gapfill", ...payload }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const raw = await resp.text();
  if (!resp.ok) throw new Error(`ai-exam-writer ${resp.status}: ${raw.slice(0, 300)}`);
  let data: any;
  try {
    data = JSON.parse(raw.trim());
  } catch {
    throw new Error(`ai-exam-writer returned invalid JSON: ${raw.slice(0, 200)}`);
  }
  if (data?.error) throw new Error(String(data.error).slice(0, 300));
  return data;
}

/** Mirror patched modules onto the legacy exam columns the templates still read. */
function mirrorColumns(sections: Record<string, any>, keys: string[]) {
  const out: Record<string, any> = {};
  const has = (k: string) => keys.includes(k);
  if (has("overview") && sections.overview) out.description = sections.overview;
  if (has("dates") && Array.isArray(sections.dates) && sections.dates.length) {
    out.important_dates = sections.dates;
    const exam = sections.dates.find((d: any) => /exam(ination)?\b/i.test(d?.event || ""));
    if (exam?.date) out.exam_date = exam.date;
    const reg = sections.dates.find((d: any) =>
      /registration end|last date|registration close/i.test(d?.event || ""));
    if (reg?.date) out.registration_deadline = reg.date;
  }
  if (has("pattern") && sections.pattern) out.pattern = sections.pattern;
  if (has("cutoffs") && sections.cutoffs) out.cutoffs = sections.cutoffs;
  if (has("faqs") && Array.isArray(sections.faqs) && sections.faqs.length) out.faqs = sections.faqs;
  if (has("eligibility") && sections.eligibility?.summary) out.eligibility = sections.eligibility.summary;
  if (has("syllabus") && Array.isArray(sections.syllabus) && sections.syllabus.length) {
    out.syllabus = sections.syllabus.map((s: any) => s?.subject || "").filter(Boolean);
  }
  if (has("hero") && sections.hero) {
    const h = sections.hero;
    if (h.conducting_body) out.conducting_body = h.conducting_body;
    if (h.frequency) out.frequency = h.frequency;
    if (h.duration) out.duration = h.duration;
    if (h.exam_mode) out.exam_mode = h.exam_mode;
    if (h.exam_level) out.exam_level = h.exam_level;
    if (h.exam_status) out.exam_status = h.exam_status;
    if (h.registration_status) out.registration_status = h.registration_status;
    if (h.official_website) out.official_website = h.official_website;
    if (h.full_form) out.full_name = h.full_form;
  }
  if (has("seo") && sections.seo) {
    const s = sections.seo;
    if (s.meta_title) out.meta_title = s.meta_title;
    if (s.meta_description) out.meta_description = s.meta_description;
    if (s.h1) out.h1_tag = s.h1;
    if (s.primary_keyword) out.primary_keyword = s.primary_keyword;
    if (Array.isArray(s.keywords) && s.keywords.length) out.keywords = s.keywords;
  }
  return out;
}

async function rollupJob(sb: any, jobId: string | null) {
  if (!jobId) return;
  const { data: items } = await sb
    .from("exam_backfill_items")
    .select("status,fields_filled,tokens_used")
    .eq("job_id", jobId);
  const rows = items || [];
  const completed = rows.filter((r: any) => r.status === "completed").length;
  const failed = rows.filter((r: any) => r.status === "failed").length;
  const done = completed + failed >= rows.length && rows.length > 0;
  await sb.from("exam_backfill_jobs").update({
    total: rows.length,
    completed,
    failed,
    fields_filled: rows.reduce((a: number, r: any) => a + (r.fields_filled || 0), 0),
    tokens_used: rows.reduce((a: number, r: any) => a + (r.tokens_used || 0), 0),
    status: done ? "completed" : "running",
    updated_at: new Date().toISOString(),
    ...(done ? { finished_at: new Date().toISOString() } : {}),
  }).eq("id", jobId);
}

async function processItem(sb: any, item: Item) {
  const { data: exam, error } = await sb
    .from("exams")
    .select("id,name,slug,exam_year,official_website,exam_category,sections,sources")
    .eq("id", item.exam_id)
    .maybeSingle();
  if (error) throw new Error(`exam load failed: ${error.message}`);
  if (!exam) throw new Error("exam no longer exists");

  const sections: Record<string, any> =
    exam.sections && typeof exam.sections === "object" ? { ...exam.sections } : {};

  let gaps: Gap[] = auditExamSections(sections);
  const gapsBefore = item.gaps_before ?? gaps.length;

  await sb.from("exam_backfill_items").update({
    step: `Auditing ${exam.name} — ${gaps.length} gaps`,
    gaps: gaps.slice(0, 80),
    gaps_before: gapsBefore,
  }).eq("id", item.id);

  if (!gaps.length) {
    await sb.from("exam_backfill_items").update({
      status: "completed",
      step: "Already complete — nothing to fill",
      gaps_after: 0,
      worker_lock_until: null,
      finished_at: new Date().toISOString(),
      error: null,
    }).eq("id", item.id);
    await appendLog(sb, item.id, { level: "success", message: "No gaps found — exam already complete." });
    await rollupJob(sb, item.job_id);
    return;
  }

  await appendLog(sb, item.id, {
    level: "info",
    message: `${gaps.length} gaps: ${[...new Set(gaps.map((g) => g.key))].join(", ")}`,
  });

  let tokens = item.tokens_used ?? 0;
  let passes = item.passes ?? 0;
  let filled = 0;
  let research = item.research?.notes ? item.research : undefined;

  for (let p = 0; p < PASSES_PER_RUN && gaps.length; p++) {
    await sb.from("exam_backfill_items").update({
      step: `Researching official sources & filling ${[...new Set(gaps.map((g) => g.key))].slice(0, 4).join(", ")}`,
      worker_lock_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
    }).eq("id", item.id);

    const result = await callGapfill({
      exam_name: exam.name,
      exam_year: exam.exam_year ?? item.exam_year,
      official_website: exam.official_website || item.official_website,
      exam_category: exam.exam_category,
      sections,
      gaps,
      ...(research ? { research } : {}),
    });

    tokens += result.tokens_used ?? 0;
    passes += 1;
    if (!research && result.research?.notes) research = result.research;

    const patch: Record<string, any> = result.patch && typeof result.patch === "object" ? result.patch : {};
    const patchedKeys = Object.keys(patch);

    if (!patchedKeys.length) {
      await appendLog(sb, item.id, { level: "warn", message: "AI returned no new verified content this pass." });
      break;
    }

    Object.assign(sections, patch);
    const cleaned = pruneBlankContent(sections);
    for (const k of Object.keys(cleaned)) sections[k] = cleaned[k];

    const mergedSources = Array.isArray(exam.sources) ? [...exam.sources] : [];
    const seen = new Set(mergedSources.map((s: any) => s?.url));
    for (const s of result.sources || []) {
      if (s?.url && !seen.has(s.url)) { mergedSources.push(s); seen.add(s.url); }
    }

    const { error: saveErr } = await sb.from("exams").update({
      sections,
      sources: mergedSources.length ? mergedSources : null,
      ...mirrorColumns(sections, patchedKeys),
      updated_at: new Date().toISOString(),
    }).eq("id", exam.id);
    if (saveErr) throw new Error(`save failed: ${saveErr.message}`);

    const after = auditExamSections(sections);
    filled += Math.max(0, gaps.length - after.length);
    await appendLog(sb, item.id, {
      level: after.length ? "warn" : "success",
      message: `Filled ${patchedKeys.join(", ")} · gaps ${gaps.length} → ${after.length}`,
      tokens: result.tokens_used ?? 0,
    });
    gaps = after;

    await sb.from("exam_backfill_items").update({
      gaps: gaps.slice(0, 80),
      gaps_after: gaps.length,
      passes,
      tokens_used: tokens,
      fields_filled: filled,
      research: research ?? null,
      worker_lock_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
    }).eq("id", item.id);
  }

  const stillOpen = gaps.length > 0;
  const exhausted = (item.attempts ?? 1) >= MAX_ATTEMPTS;
  const score = completenessScore(gaps);

  await sb.from("exam_backfill_items").update({
    status: stillOpen && !exhausted ? "queued" : "completed",
    step: stillOpen
      ? `${score}% complete — ${gaps.length} gaps left${exhausted ? " (attempt cap reached)" : " (queued for another pass)"}`
      : "100% complete — all modules filled",
    gaps: gaps.slice(0, 80),
    gaps_after: gaps.length,
    passes,
    tokens_used: tokens,
    fields_filled: filled,
    research: research ?? null,
    worker_lock_until: null,
    ...(stillOpen && !exhausted ? {} : { finished_at: new Date().toISOString() }),
    error: null,
  }).eq("id", item.id);

  await rollupJob(sb, item.job_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const workerKey = req.headers.get("x-worker-key");
  if (workerKey !== SERVICE_KEY) {
    // Admin-triggered calls go through the client with the user's JWT; only the
    // service key may drive the worker lanes.
    const auth = req.headers.get("Authorization") || "";
    const sbUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await sbUser.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  try {
    // ---- Dispatcher mode -------------------------------------------------
    if (!body?.worker) {
      const pending = await pendingCount(sb);
      const requested = Number(body?.concurrency) || DEFAULT_CONCURRENCY;
      const lanes = Math.max(0, Math.min(pending, MAX_CONCURRENCY, Math.max(1, requested)));
      for (let i = 0; i < lanes; i++) {
        EdgeRuntime.waitUntil(
          invokeSelf({ worker: true, lane: i, budget: 8 }).catch((e) =>
            console.error("backfill dispatch failed", e instanceof Error ? e.message : String(e))),
        );
      }
      return jsonResponse({ mode: "dispatch", pending, workers_started: lanes });
    }

    // ---- Worker lane -----------------------------------------------------
    const budget = Math.max(1, Math.min(8, Number(body?.budget) || 8));
    const item = await claimItem(sb);
    let processed = 0;

    if (item) {
      try {
        await processItem(sb, item);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const failed = (item.attempts ?? 0) >= MAX_ATTEMPTS;
        await sb.from("exam_backfill_items").update({
          status: failed ? "failed" : "queued",
          step: failed ? "Failed — attempt cap reached" : "Retry queued",
          error: msg.slice(0, 800),
          worker_lock_until: null,
          ...(failed ? { finished_at: new Date().toISOString() } : {}),
        }).eq("id", item.id);
        await appendLog(sb, item.id, { level: "error", message: msg.slice(0, 500) });
        await rollupJob(sb, item.job_id);
      }
      processed++;
    }

    const pending = await pendingCount(sb);
    if (pending > 0 && budget > 1) {
      EdgeRuntime.waitUntil(
        invokeSelf({ worker: true, lane: body?.lane ?? 0, budget: budget - 1 }).catch((e) =>
          console.error("backfill continuation failed", e instanceof Error ? e.message : String(e))),
      );
    }

    return jsonResponse({ mode: "worker", processed, pending });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
