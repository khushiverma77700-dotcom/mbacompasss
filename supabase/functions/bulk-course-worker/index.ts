// Bulk Course Worker — fully autonomous queue for AI course generation per institute.
// Modes:
//   POST { institute_ids: [...], options, label } with admin Bearer auth
//     → create job + items, kick processing in background, return job_id.
//   POST { resume_item_id: "<id>" } with admin auth → re-queue one failed item.
//   POST {} (cron / internal pump) → reclaim stale-locked items and pump next batch.
//
// One item = one institute. The worker:
//   1) discover courses via ai-course-writer mode=discover
//   2) generate course content via ai-course-writer mode=generate (in chunks of 2)
//   3) insert rows into public.courses
//   4) mark item completed, kick the next pending item (waitUntil) so the
//      laptop can be closed and processing continues from cron pump every minute.

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

const MAX_PARALLEL = 2;            // institutes processed in parallel
const ITEM_LOCK_MS = 12 * 60_000;  // 12 min per institute (generate is the slow part)
const CHUNK = 2;                   // courses per generate call (matches AdminWriteCourses)

function nowIso() { return new Date().toISOString(); }
function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Call ai-course-writer (verify_jwt = false, no auth needed).
async function callWriter(body: any, timeoutMs: number) {
  const resp = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/ai-course-writer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  }, timeoutMs);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || `ai-course-writer HTTP ${resp.status}`);
  return data;
}

async function findCategoryId(admin: any, exam?: string, name?: string) {
  const { data: cats } = await admin.from("course_categories").select("id,name").eq("active", true);
  if (!cats?.length) return null;
  const hay = `${exam || ""} ${name || ""}`.toLowerCase();
  const match = cats.find((c: any) => hay.includes((c.name || "").toLowerCase().split(/\s|-/)[0] || "___"))
    || cats.find((c: any) => (c.name || "").toLowerCase().includes((exam || "").toLowerCase()));
  return match?.id || null;
}

async function processItem(admin: any, itemId: string) {
  // Atomically claim the item.
  const lockUntil = new Date(Date.now() + ITEM_LOCK_MS).toISOString();
  const { data: claimed } = await admin
    .from("bulk_course_items")
    .update({
      status: "discovering",
      started_at: nowIso(),
      worker_lock_until: lockUntil,
      error_message: null,
      progress_step: "Claimed — preparing to discover courses",
    })
    .eq("id", itemId)
    .in("status", ["pending", "failed"])
    .select("*, bulk_course_jobs!inner(options,created_by)")
    .maybeSingle();
  if (!claimed) return;

  const opts = claimed.bulk_course_jobs?.options || {};
  const examFocus: string[] = Array.isArray(opts.examFocus) ? opts.examFocus : ["CAT", "XAT"];
  const maxCourses: number = Math.min(50, Math.max(3, Number(opts.maxCoursesPerInstitute) || 15));
  const skipIfHasCourses: boolean = !!opts.skipIfHasCourses;
  const autoPublish: boolean = opts.autoPublish !== false;
  const contentDateContext: string = String(opts.contentDateContext || "").trim();

  try {
    // Load institute context.
    const { data: inst, error: instErr } = await admin
      .from("institutes")
      .select("id,name,city,state,mode,website")
      .eq("id", claimed.institute_id)
      .maybeSingle();
    if (instErr) throw new Error(`Institute lookup failed: ${instErr.message}`);
    if (!inst) throw new Error("Institute not found");
    (inst as any).established = null;

    if (skipIfHasCourses) {
      const { count } = await admin
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", inst.id);
      if ((count || 0) > 0) {
        await admin.from("bulk_course_items").update({
          status: "skipped",
          progress_step: `Skipped — ${count} courses already exist`,
          finished_at: nowIso(),
          worker_lock_until: null,
        }).eq("id", itemId);
        return;
      }
    }

    // 1) Discover.
    await admin.from("bulk_course_items").update({
      progress_step: "Discovering MBA courses from the web…",
    }).eq("id", itemId);

    const discover = await callWriter({
      mode: "discover",
      max: maxCourses,
      contentDateContext: contentDateContext || undefined,
      institute: {
        name: inst.name, city: inst.city, state: inst.state, mode: inst.mode,
        website: inst.website, established: inst.established, examFocus,
      },
    }, 90_000);

    const seeds = (discover?.courses || []).map((c: any) => ({
      name: String(c.name || "").trim(),
      exam: String(c.exam || "CAT"),
      mode: ["Offline", "Online", "Hybrid"].includes(c.mode) ? c.mode : (inst.mode || "Hybrid"),
    })).filter((c: any) => c.name);

    if (seeds.length === 0) {
      await admin.from("bulk_course_items").update({
        status: "completed",
        progress_step: "No courses discovered for this institute",
        finished_at: nowIso(),
        worker_lock_until: null,
      }).eq("id", itemId);
      return;
    }

    await admin.from("bulk_course_items").update({
      status: "generating",
      courses_found: seeds.length,
      progress_step: `Found ${seeds.length} courses — generating content (0/${seeds.length})…`,
    }).eq("id", itemId);

    // 2) Generate in chunks.
    const chunks: typeof seeds[] = [];
    for (let i = 0; i < seeds.length; i += CHUNK) chunks.push(seeds.slice(i, i + CHUNK));

    let saved = 0;
    let failedCount = 0;
    const savedNames: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Refresh lock so the watchdog doesn't reclaim mid-generation.
      await admin.from("bulk_course_items").update({
        worker_lock_until: new Date(Date.now() + ITEM_LOCK_MS).toISOString(),
        progress_step: `Generating content ${saved}/${seeds.length}…`,
      }).eq("id", itemId);

      let gen: any[] = [];
      try {
        const out = await callWriter({
          mode: "generate",
          contentDateContext: contentDateContext || undefined,
          institute: {
            name: inst.name, city: inst.city, state: inst.state, mode: inst.mode,
            website: inst.website, examFocus,
          },
          courses: chunk,
        }, 140_000);
        gen = Array.isArray(out?.courses) ? out.courses : [];
      } catch (e: any) {
        failedCount += chunk.length;
        await admin.from("bulk_course_items").update({
          error_message: `Generate chunk ${i + 1}/${chunks.length}: ${String(e?.message || e).slice(0, 240)}`,
        }).eq("id", itemId);
        continue;
      }

      // 3) Save each row.
      for (const g of gen) {
        try {
          const cat = await findCategoryId(admin, g.exam, g.name);
          const row = {
            institute_id: inst.id,
            course_category_id: cat,
            name: String(g.name || "").trim(),
            description: String(g.description_html || g.short_description || ""),
            duration: g.duration || null,
            fees: typeof g.fees_inr === "number" && g.fees_inr > 0 ? g.fees_inr : null,
            batch_info: g.batch_info || null,
            curriculum: Array.isArray(g.curriculum) && g.curriculum.length ? g.curriculum : null,
            mode: g.mode || inst.mode || "Hybrid",
            start_date: g.start_date || null,
            total_seats: g.total_seats || null,
            highlights: Array.isArray(g.highlights) ? g.highlights : [],
            eligibility: g.eligibility || null,
            discount_text: g.discount_text || null,
            rating: 0,
            enrolled_count: 0,
          };
          if (!row.name) { failedCount++; continue; }
          const { error: insErr } = await admin.from("courses").insert(row);
          if (insErr) {
            failedCount++;
            await admin.from("bulk_course_items").update({
              error_message: `Save "${row.name}": ${insErr.message}`.slice(0, 240),
            }).eq("id", itemId);
            continue;
          }
          saved++;
          savedNames.push(row.name);
        } catch (e: any) {
          failedCount++;
        }
      }

      await admin.from("bulk_course_items").update({
        courses_saved: saved,
        courses_failed: failedCount,
        course_names: savedNames,
        progress_step: `Generated & published ${saved}/${seeds.length}…`,
      }).eq("id", itemId);
    }

    const finalStatus = saved > 0 ? "completed" : "failed";
    await admin.from("bulk_course_items").update({
      status: finalStatus,
      courses_saved: saved,
      courses_failed: failedCount,
      course_names: savedNames,
      progress_step: finalStatus === "completed"
        ? `Published ${saved}/${seeds.length} courses${autoPublish ? " (live)" : ""}`
        : `Generation produced 0 courses (failed: ${failedCount})`,
      finished_at: nowIso(),
      worker_lock_until: null,
      error_message: finalStatus === "failed" ? "AI generation did not return any usable courses" : null,
    }).eq("id", itemId);
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 480);
    const { data: cur } = await admin.from("bulk_course_items").select("retry_count").eq("id", itemId).maybeSingle();
    const attempts = (cur?.retry_count || 0) + 1;
    const shouldRetry = attempts < 3;
    await admin.from("bulk_course_items").update({
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
  const { data: jobs } = await admin
    .from("bulk_course_jobs")
    .select("id")
    .eq("status", "running");
  for (const j of jobs || []) {
    const { data: items } = await admin
      .from("bulk_course_items")
      .select("status")
      .eq("job_id", j.id);
    if (!items?.length) continue;
    const open = items.some((i: any) => i.status === "pending" || i.status === "discovering" || i.status === "generating");
    if (open) continue;
    const anyFail = items.some((i: any) => i.status === "failed");
    const anyOk = items.some((i: any) => i.status === "completed" || i.status === "skipped");
    const next = anyFail && anyOk ? "partial" : anyFail ? "failed" : "completed";
    await admin.from("bulk_course_jobs").update({ status: next }).eq("id", j.id);
  }
}

async function reclaimStale(admin: any) {
  // Items locked past TTL → back to pending.
  await admin
    .from("bulk_course_items")
    .update({
      status: "pending",
      worker_lock_until: null,
      progress_step: "Recovered — re-queued",
    })
    .in("status", ["discovering", "generating"])
    .lt("worker_lock_until", nowIso());

  // Belt-and-braces: anything that hasn't received a progress update in
  // 4 minutes is considered abandoned (worker instance was killed mid-flight).
  const staleIso = new Date(Date.now() - 4 * 60_000).toISOString();
  await admin
    .from("bulk_course_items")
    .update({
      status: "pending",
      worker_lock_until: null,
      progress_step: "Recovered — worker stalled, re-queued",
    })
    .in("status", ["discovering", "generating"])
    .lt("updated_at", staleIso);
}

async function pump(admin: any, limit = MAX_PARALLEL) {
  await reclaimStale(admin);
  // Count current in-flight items globally.
  const { count: active } = await admin
    .from("bulk_course_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["discovering", "generating"]);
  const slots = Math.max(0, limit - (active || 0));
  if (slots <= 0) return 0;

  const { data: pending } = await admin
    .from("bulk_course_items")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(slots);
  if (!pending?.length) return 0;

  for (const p of pending) {
    // @ts-ignore EdgeRuntime available in Supabase Edge
    EdgeRuntime.waitUntil(processItem(admin, p.id).then(async () => {
      // Chain: after finishing, try to pull the next pending.
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
  const internalKey = req.headers.get("x-internal-pump-key") || "";
  const isInternal = !!internalKey && internalKey === SERVICE_KEY;

  // Always roll up + try pumping anything pending.
  await rollupJobs(admin);

  // Internal / cron pump — no auth needed.
  if (isInternal || (!userToken && !body?.institute_ids && !body?.resume_item_id)) {
    const dispatched = await pump(admin);
    return json(200, { ok: true, mode: "pump", dispatched });
  }

  // Validate admin for user-initiated actions.
  if (!userToken) return json(401, { error: "auth required" });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return json(401, { error: "invalid auth" });
  const { data: roleRow } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json(403, { error: "admin only" });

  // Resume a single item (retry).
  if (body?.resume_item_id) {
    await admin.from("bulk_course_items").update({
      status: "pending", worker_lock_until: null, error_message: null,
      progress_step: "Resumed — queued",
    }).eq("id", body.resume_item_id);
    const dispatched = await pump(admin);
    return json(200, { ok: true, resumed: body.resume_item_id, dispatched });
  }

  // Create new job.
  const ids: string[] = Array.isArray(body?.institute_ids) ? body.institute_ids.filter(Boolean) : [];
  if (!ids.length) return json(400, { error: "institute_ids required" });

  // Resolve institute names for nicer display.
  const { data: insts } = await admin
    .from("institutes").select("id,name").in("id", ids);
  const nameById = new Map<string, string>((insts || []).map((r: any) => [r.id, r.name]));

  const { data: job, error: jErr } = await admin
    .from("bulk_course_jobs")
    .insert({
      created_by: user.id,
      label: body?.label || `Bulk course generation — ${ids.length} institutes`,
      options: body?.options || {},
      total_institutes: ids.length,
      status: "running",
    })
    .select("id")
    .single();
  if (jErr || !job) return json(500, { error: jErr?.message || "could not create job" });

  const rows = ids.map((id) => ({
    job_id: job.id,
    institute_id: id,
    institute_name: nameById.get(id) || "Institute",
    status: "pending",
    progress_step: "Queued",
  }));
  const { error: iErr } = await admin.from("bulk_course_items").insert(rows);
  if (iErr) return json(500, { error: iErr.message });

  // @ts-ignore EdgeRuntime is available in Supabase Edge
  EdgeRuntime.waitUntil(pump(admin));

  return json(200, { ok: true, job_id: job.id, queued: ids.length });
});
