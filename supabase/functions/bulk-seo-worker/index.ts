// Bulk SEO Worker — fully autonomous queue for AI-powered SEO generation
// for institutes and courses. Survives browser close via cron pump.
//
// Modes:
//   POST { target_type:'institute'|'course', target_ids:[...], options, label } (admin auth)
//     → create job + items, kick processing in background, return job_id.
//   POST { resume_item_id } (admin auth) → re-queue one failed item.
//   POST {} / cron pump → reclaim stale, dispatch next batch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCredential } from "../_shared/getCredential.ts";

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

const MAX_PARALLEL = 3;
const ITEM_LOCK_MS = 5 * 60_000;
const SITE_ORIGIN = "https://mbacompass.in";
const OPENAI_MODEL = "gpt-4o-mini";

// Approx OpenAI gpt-4o-mini pricing (USD per 1K tokens) for display.
const CREDIT_PER_1K_IN = 0.00015;
const CREDIT_PER_1K_OUT = 0.0006;

function nowIso() { return new Date().toISOString(); }
function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function buildPrompt(target: any, kind: "institute" | "course", opts: any) {
  const year = new Date().getFullYear();
  const url = kind === "institute"
    ? `${SITE_ORIGIN}/coaching/${target.slug || target.id}`
    : `${SITE_ORIGIN}/coaching/${target.institute_slug || ""}/courses/${target.slug || target.id}`;

  const ctx = kind === "institute"
    ? `Institute: ${target.name}
City: ${target.city || "India"}
State: ${target.state || ""}
Mode: ${target.mode || ""}
Existing description (may be empty): ${(target.description || "").slice(0, 800)}
Specializations: ${(target.specializations || []).join(", ")}
Existing primary keyword: ${target.primary_keyword || "(none)"}`
    : `Course: ${target.name}
Institute: ${target.institute_name || ""} (${target.city || ""}, ${target.state || ""})
Duration: ${target.duration || ""}
Mode: ${target.mode || ""}
Existing description (may be empty): ${(target.description || "").slice(0, 800)}`;

  return `You are a senior MBA-coaching SEO strategist. Produce a complete, advanced on-page + technical SEO package for the page below, optimised to rank on Google India in ${year}.

Page URL: ${url}
${ctx}

Rules:
- Meta title 50–60 chars, includes primary keyword + city (if relevant) + brand "MBA Compass".
- Meta description 140–160 chars, action-oriented, includes primary keyword + USP + CTA.
- H1: distinct from meta title, includes primary keyword naturally.
- primary_keyword: the single best high-intent search query Indian aspirants actually type.
- short_tail_keywords: 8–12 high-volume 1–3 word queries (head terms).
- long_tail_keywords: 12–20 long-tail 4+ word queries Indian users actually search (questions, year-stamped, location-stamped, comparison, "best", "fees", "reviews", etc.).
- og_title / twitter_title ~60 chars; og_description / twitter_description ~140 chars (different wording than meta).
- schema_jsonld: a single valid JSON-LD object using ${kind === "institute" ? "EducationalOrganization" : "Course"} schema with all real fields filled (name, description, url, provider, sameAs, areaServed, offers if course, aggregateRating only if you have real numbers, address for institute). Include @context "https://schema.org".
- faqs: 6–10 truly useful FAQ pairs (Indian audience, year-specific, fees, eligibility, comparison, placement).
- canonical_url: use the page URL above as-is.

Return ONLY valid JSON, no commentary, with this exact shape:
{
  "meta_title": "",
  "meta_description": "",
  "h1_tag": "",
  "primary_keyword": "",
  "short_tail_keywords": [],
  "long_tail_keywords": [],
  "og_title": "",
  "og_description": "",
  "twitter_title": "",
  "twitter_description": "",
  "canonical_url": "",
  "schema_jsonld": {},
  "faqs": [{"q":"","a":""}],
  "seo_score": 0
}`;
}

async function callAI(prompt: string) {
  const resp = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert SEO strategist for Indian MBA coaching directories. Always return strict JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  }, 90_000);
  const data = await resp.json();
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Rate limit (429) — will retry");
    if (resp.status === 402) throw new Error("AI credits exhausted (402) — top up Lovable AI");
    throw new Error(`AI gateway HTTP ${resp.status}: ${data?.error?.message || JSON.stringify(data).slice(0,200)}`);
  }
  const content = data?.choices?.[0]?.message?.content || "{}";
  const usage = data?.usage || {};
  let parsed: any = {};
  try { parsed = JSON.parse(content); }
  catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  return { parsed, usage };
}

function countFilled(seo: any) {
  let n = 0;
  for (const k of ["meta_title","meta_description","h1_tag","primary_keyword","og_title","og_description","twitter_title","twitter_description","canonical_url"]) {
    if (seo[k] && String(seo[k]).trim()) n++;
  }
  if (Array.isArray(seo.short_tail_keywords) && seo.short_tail_keywords.length) n++;
  if (Array.isArray(seo.long_tail_keywords) && seo.long_tail_keywords.length) n++;
  if (seo.schema_jsonld && Object.keys(seo.schema_jsonld).length) n++;
  if (Array.isArray(seo.faqs) && seo.faqs.length) n++;
  return n;
}

async function processItem(admin: any, itemId: string) {
  const lockUntil = new Date(Date.now() + ITEM_LOCK_MS).toISOString();
  const { data: claimed } = await admin
    .from("bulk_seo_items")
    .update({
      status: "researching",
      started_at: nowIso(),
      worker_lock_until: lockUntil,
      error_message: null,
      progress_step: "Loading target & researching keywords…",
    })
    .eq("id", itemId)
    .in("status", ["pending", "failed"])
    .select("*")
    .maybeSingle();
  if (!claimed) return;

  try {
    let target: any = null;
    if (claimed.target_type === "institute") {
      const { data, error } = await admin
        .from("institutes")
        .select("id,name,slug,city,state,mode,description,specializations,primary_keyword")
        .eq("id", claimed.target_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Institute not found");
      target = data;
    } else {
      const { data, error } = await admin
        .from("courses")
        .select("id,name,slug,duration,mode,description,institute_id, institutes!inner(name,city,state,slug)")
        .eq("id", claimed.target_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Course not found");
      target = {
        ...data,
        institute_name: (data as any).institutes?.name,
        institute_slug: (data as any).institutes?.slug,
        city: (data as any).institutes?.city,
        state: (data as any).institutes?.state,
      };
    }

    await admin.from("bulk_seo_items").update({
      status: "generating",
      progress_step: "Calling AI — meta, keywords, schema, OG, Twitter, FAQs…",
      worker_lock_until: new Date(Date.now() + ITEM_LOCK_MS).toISOString(),
    }).eq("id", itemId);

    const prompt = buildPrompt(target, claimed.target_type, claimed.options || {});
    const { parsed, usage } = await callAI(prompt);

    const tokensIn = usage?.prompt_tokens || 0;
    const tokensOut = usage?.completion_tokens || 0;
    const cost = (tokensIn / 1000) * CREDIT_PER_1K_IN + (tokensOut / 1000) * CREDIT_PER_1K_OUT;

    const filled = countFilled(parsed);
    if (filled < 5) throw new Error("AI response missing too many SEO fields");

    const update: any = {
      meta_title: parsed.meta_title || null,
      meta_description: parsed.meta_description || null,
      h1_tag: parsed.h1_tag || null,
      primary_keyword: parsed.primary_keyword || null,
      keywords: Array.isArray(parsed.short_tail_keywords) ? parsed.short_tail_keywords.slice(0, 30) : [],
      long_tail_keywords: Array.isArray(parsed.long_tail_keywords) ? parsed.long_tail_keywords.slice(0, 40) : [],
      og_title: parsed.og_title || null,
      og_description: parsed.og_description || null,
      twitter_title: parsed.twitter_title || null,
      twitter_description: parsed.twitter_description || null,
      canonical_url: parsed.canonical_url || null,
      schema_jsonld: parsed.schema_jsonld || null,
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
      seo_score: typeof parsed.seo_score === "number" ? parsed.seo_score : Math.min(100, 60 + filled * 3),
      last_seo_refresh: nowIso(),
    };

    const table = claimed.target_type === "institute" ? "institutes" : "courses";
    const { error: upErr } = await admin.from(table).update(update).eq("id", claimed.target_id);
    if (upErr) throw new Error(`Save: ${upErr.message}`);

    await admin.from("bulk_seo_items").update({
      status: "completed",
      progress_step: `Live ✓ ${filled}/13 fields, ${tokensIn + tokensOut} tokens`,
      finished_at: nowIso(),
      worker_lock_until: null,
      seo_score: update.seo_score,
      tokens_used: tokensIn + tokensOut,
      cost_credits: Number(cost.toFixed(4)),
      fields_filled: filled,
    }).eq("id", itemId);
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 480);
    const { data: cur } = await admin.from("bulk_seo_items").select("retry_count").eq("id", itemId).maybeSingle();
    const attempts = (cur?.retry_count || 0) + 1;
    const shouldRetry = attempts < 3;
    await admin.from("bulk_seo_items").update({
      status: shouldRetry ? "pending" : "failed",
      retry_count: attempts,
      error_message: msg,
      progress_step: shouldRetry ? `Error — will retry (attempt ${attempts})` : `Failed after ${attempts} attempts`,
      worker_lock_until: null,
      finished_at: shouldRetry ? null : nowIso(),
    }).eq("id", itemId);
  }
}

async function rollupJobs(admin: any) {
  const { data: jobs } = await admin.from("bulk_seo_jobs").select("id").eq("status", "running");
  for (const j of jobs || []) {
    const { data: items } = await admin.from("bulk_seo_items").select("status").eq("job_id", j.id);
    if (!items?.length) continue;
    const open = items.some((i: any) => ["pending","researching","generating"].includes(i.status));
    if (open) continue;
    const anyFail = items.some((i: any) => i.status === "failed");
    const anyOk = items.some((i: any) => i.status === "completed");
    const next = anyFail && anyOk ? "partial" : anyFail ? "failed" : "completed";
    await admin.from("bulk_seo_jobs").update({ status: next }).eq("id", j.id);
  }
}

async function reclaimStale(admin: any) {
  await admin
    .from("bulk_seo_items")
    .update({ status: "pending", worker_lock_until: null, progress_step: "Recovered — re-queued" })
    .in("status", ["researching","generating"])
    .lt("worker_lock_until", nowIso());

  const staleIso = new Date(Date.now() - 3 * 60_000).toISOString();
  await admin
    .from("bulk_seo_items")
    .update({ status: "pending", worker_lock_until: null, progress_step: "Recovered — worker stalled" })
    .in("status", ["researching","generating"])
    .lt("updated_at", staleIso);
}

async function pump(admin: any, limit = MAX_PARALLEL) {
  await reclaimStale(admin);
  const { count: active } = await admin
    .from("bulk_seo_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["researching","generating"]);
  const slots = Math.max(0, limit - (active || 0));
  if (slots <= 0) return 0;

  const { data: pending } = await admin
    .from("bulk_seo_items")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(slots);
  if (!pending?.length) return 0;

  for (const p of pending) {
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(processItem(admin, p.id).then(async () => {
      await pump(admin, limit);
      await rollupJobs(admin);
    }));
  }
  return pending.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({}));
  const auth = req.headers.get("Authorization") || "";
  const userToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  await rollupJobs(admin);

  // Internal / cron pump
  if (!userToken && !body?.target_ids && !body?.resume_item_id) {
    const dispatched = await pump(admin);
    return json(200, { ok: true, mode: "pump", dispatched });
  }

  if (!userToken) return json(401, { error: "auth required" });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return json(401, { error: "invalid auth" });
  const { data: roleRow } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json(403, { error: "admin only" });

  if (body?.resume_item_id) {
    await admin.from("bulk_seo_items").update({
      status: "pending", worker_lock_until: null, error_message: null,
      progress_step: "Resumed — queued",
    }).eq("id", body.resume_item_id);
    const dispatched = await pump(admin);
    return json(200, { ok: true, resumed: body.resume_item_id, dispatched });
  }

  const targetType = body?.target_type === "course" ? "course" : "institute";
  const ids: string[] = Array.isArray(body?.target_ids) ? body.target_ids.filter(Boolean) : [];
  if (!ids.length) return json(400, { error: "target_ids required" });

  let nameById = new Map<string, string>();
  if (targetType === "institute") {
    const { data } = await admin.from("institutes").select("id,name").in("id", ids);
    nameById = new Map((data || []).map((r: any) => [r.id, r.name]));
  } else {
    const { data } = await admin.from("courses").select("id,name").in("id", ids);
    nameById = new Map((data || []).map((r: any) => [r.id, r.name]));
  }

  const { data: job, error: jErr } = await admin
    .from("bulk_seo_jobs")
    .insert({
      created_by: user.id,
      target_type: targetType,
      label: body?.label || `Bulk SEO — ${ids.length} ${targetType}(s)`,
      options: body?.options || {},
      total_items: ids.length,
      status: "running",
    })
    .select("id").single();
  if (jErr || !job) return json(500, { error: jErr?.message || "could not create job" });

  const rows = ids.map((id) => ({
    job_id: job.id,
    target_type: targetType,
    target_id: id,
    target_name: nameById.get(id) || (targetType === "institute" ? "Institute" : "Course"),
    status: "pending",
    progress_step: "Queued",
  }));
  const { error: iErr } = await admin.from("bulk_seo_items").insert(rows);
  if (iErr) return json(500, { error: iErr.message });

  // @ts-ignore
  EdgeRuntime.waitUntil(pump(admin));
  return json(200, { ok: true, job_id: job.id, queued: ids.length });
});
