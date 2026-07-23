// seo-reoptimize-worker — processes the Re-SEO queue one item at a time.
//
// Triggered by:
//   • seo-reoptimize enqueue (POST { run_id }) — direct kick.
//   • Optional pg_cron pump (POST {} with service key) — reclaim stale items.
//
// For each item it:
//   1. Loads the underlying record (colleges/institutes/exams/city_pages/articles/courses/categories/static).
//   2. Builds a rich PageContext.
//   3. Runs the shared seoPipeline (single primary keyword workflow).
//   4. Writes SEO fields to the source table (when supported) AND upserts page_seo_overrides.
//   5. Updates queue row with before/after snapshot, chosen KW, score delta.
//   6. Self-kicks in background until the run drains.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runSeoPipeline, type PageContext } from "../_shared/seoPipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_ORIGIN = "https://mbacompass.in";

const BATCH_SIZE = 2;
const ITEM_LOCK_MS = 6 * 60_000;
const MAX_ATTEMPTS = 3;

const SOURCE_TABLE_BY_TYPE: Record<string, string> = {
  college: "colleges",
  institute: "institutes",
  exam: "exams",
  cityPage: "city_pages",
  article: "articles",
  course: "courses",
  category: "categories",
};

const SUPPORTS_SEO_COLUMNS = new Set(["college", "institute", "exam", "cityPage", "article"]);

function nowIso() { return new Date().toISOString(); }

async function fetchSource(sb: any, pageType: string, pageId: string | null, slug: string) {
  const table = SOURCE_TABLE_BY_TYPE[pageType];
  if (!table || !pageId) return null;
  const { data } = await sb.from(table).select("*").eq("id", pageId).maybeSingle();
  if (data) return data;
  // Fall back to slug
  const { data: bySlug } = await sb.from(table).select("*").eq("slug", slug).maybeSingle();
  return bySlug || null;
}

function scoreFromResult(r: any): number {
  let s = 20;
  if (r.meta_title && r.meta_title.length >= 45 && r.meta_title.length <= 62) s += 10;
  if (r.meta_description && r.meta_description.length >= 130 && r.meta_description.length <= 165) s += 10;
  if (r.h1) s += 8;
  if (r.primary_keyword) s += 8;
  if (r.faq?.length >= 5) s += 8;
  if (r.json_ld && Object.keys(r.json_ld).length > 2) s += 8;
  if (r.long_tail_keywords?.length >= 5) s += 6;
  if (r.related_queries?.length >= 5) s += 4;
  const pd = r.keyword_density?.[r.primary_keyword];
  if (typeof pd === "number" && pd >= 2.5 && pd <= 3.5) s += 10;
  else if (typeof pd === "number" && pd >= 1.5 && pd <= 4.5) s += 5;
  if (r.body_html && r.body_html.length > 3500) s += 8;
  return Math.min(100, s);
}

function wordCount(s: string): number {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function buildContext(pageType: string, slug: string, url: string, src: any): PageContext {
  const entities: string[] = [];
  if (src?.name) entities.push(src.name);
  if (src?.institute_name) entities.push(src.institute_name);
  if (src?.exam_name) entities.push(src.exam_name);
  const body = [
    src?.description,
    src?.about,
    src?.overview,
    src?.content,
    src?.body_html,
  ].filter(Boolean).join("\n\n").slice(0, 6000);

  const extras: Record<string, unknown> = {};
  for (const k of ["tier", "category", "mode", "specializations", "duration", "fees", "eligibility", "exam_date", "conducting_body", "placements", "ranking"]) {
    if (src?.[k] != null) extras[k] = src[k];
  }

  return {
    page_type: pageType,
    url,
    title: src?.meta_title || src?.name || "",
    description: src?.meta_description || "",
    h1: src?.h1_tag || src?.h1 || src?.name || "",
    body_text: body,
    location: { city: src?.city, state: src?.state },
    entities,
    existing_primary_keyword: src?.primary_keyword || undefined,
    extras,
  };
}

async function saveResult(sb: any, item: any, pageType: string, src: any, result: any) {
  const overridePayload: any = {
    slug: item.slug,
    title: result.meta_title,
    description: result.meta_description,
    h1: result.h1,
    intro_html: result.intro_html,
    body_html: result.body_html,
    keywords: [result.primary_keyword, result.secondary_keyword, ...(result.long_tail_keywords || [])].filter(Boolean),
    faq: result.faq,
    json_ld: result.json_ld,
    primary_keyword: result.primary_keyword,
    secondary_keyword: result.secondary_keyword,
    search_intent: result.search_intent,
    long_tail_keywords: result.long_tail_keywords || [],
    related_queries: result.related_queries || [],
    keyword_density: result.keyword_density || {},
    last_reoptimized_at: nowIso(),
    reoptimization_run_id: item.run_id,
    updated_at: nowIso(),
  };
  await sb.from("page_seo_overrides").upsert(overridePayload, { onConflict: "slug" });

  if (src && SUPPORTS_SEO_COLUMNS.has(pageType)) {
    const table = SOURCE_TABLE_BY_TYPE[pageType];
    const update: any = {
      meta_title: result.meta_title,
      meta_description: result.meta_description,
      keywords: [result.primary_keyword, result.secondary_keyword].filter(Boolean),
      primary_keyword: result.primary_keyword,
    };
    if (src.h1_tag !== undefined) update.h1_tag = result.h1;
    try { await sb.from(table).update(update).eq("id", src.id); } catch (e) { console.warn("mirror update failed", e); }
  }
}

async function processItem(sb: any, item: any, previewOnly: boolean): Promise<void> {
  const patch = async (p: any) => {
    await sb.from("seo_reoptimization_items").update({ ...p, updated_at: nowIso() }).eq("id", item.id);
  };
  try {
    await patch({ status: "running", stage: "reading", started_at: nowIso(), attempts: (item.attempts || 0) + 1 });
    const src = await fetchSource(sb, item.page_type, item.page_id, item.slug);
    if (!src && item.page_type !== "static") {
      throw new Error(`Source record not found for ${item.page_type}:${item.page_id || item.slug}`);
    }

    await patch({ stage: "researching" });
    const ctx = item.page_type === "static"
      ? {
          page_type: "static",
          url: item.url,
          title: item.page_name || "",
          h1: item.page_name || "",
          body_text: "",
          existing_primary_keyword: item.old_primary_keyword || undefined,
        } as PageContext
      : buildContext(item.page_type, item.slug, item.url, src);

    await patch({ stage: "generating" });
    const { result, competitors } = await runSeoPipeline(ctx, {
      feature: "seo-reoptimize",
      userId: null,
    });

    if (!previewOnly) {
      await patch({ stage: "saving" });
      await saveResult(sb, item, item.page_type, src, result);
    } else {
      await patch({ stage: "preview_ready" });
    }


    const scoreAfter = scoreFromResult(result);
    const beforeBody = (ctx.body_text || "");
    await patch({
      status: "done",
      stage: "done",
      applied: !previewOnly,
      applied_at: previewOnly ? null : nowIso(),
      discarded: false,

      new_primary_keyword: result.primary_keyword,
      secondary_keyword: result.secondary_keyword,
      search_intent: result.search_intent,
      rewrite_applied: result.rewrite_required,
      long_tail_keywords: result.long_tail_keywords || [],
      related_queries: result.related_queries || [],
      keyword_density: result.keyword_density || {},
      aeo_notes: result.aeo_notes || null,
      geo_notes: result.geo_notes || null,
      readability_score: result.readability_score || null,
      full_content_before: beforeBody,
      full_content_after: result.body_html || "",
      content_word_count_before: wordCount(beforeBody),
      content_word_count_after: wordCount(result.body_html || ""),
      before_snapshot: {
        title: ctx.title,
        description: ctx.description,
        h1: ctx.h1,
        primary_keyword: ctx.existing_primary_keyword,
        body_html: beforeBody,
      },
      after_snapshot: {
        title: result.meta_title,
        description: result.meta_description,
        h1: result.h1,
        intro_html: result.intro_html,
        body_html: result.body_html,
        outline: result.outline,
        faq: result.faq,
        faq_count: result.faq?.length || 0,
        alt_text_suggestions: result.alt_text_suggestions,
        internal_link_suggestions: result.internal_link_suggestions,
        eeat_notes: result.eeat_notes,
      },
      competitors: competitors.slice(0, 3).map((c) => ({ url: c.url, title: c.title })),
      score_after: scoreAfter,
      finished_at: nowIso(),
    });
    
    
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 500);
    console.error("seo-reoptimize-worker item failed", item.id, msg);
    const nextAttempts = (item.attempts || 0) + 1;
    await patch({
      status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "queued",
      stage: null,
      error: msg,
      locked_at: null,
    });
  }
}

async function bumpRun(sb: any, runId: string) {
  const { data: items } = await sb.from("seo_reoptimization_items")
    .select("status")
    .eq("run_id", runId);
  const list = items || [];
  const processed = list.filter((i: any) => i.status === "done" || i.status === "failed").length;
  const succeeded = list.filter((i: any) => i.status === "done").length;
  const failed = list.filter((i: any) => i.status === "failed").length;
  const remaining = list.length - processed;
  const status = remaining === 0 ? "completed" : "running";
  await sb.from("seo_reoptimization_runs").update({
    processed, succeeded, failed, status,
    finished_at: remaining === 0 ? nowIso() : null,
    updated_at: nowIso(),
  }).eq("id", runId);
  return remaining;
}

async function claimNext(sb: any, runId: string | null): Promise<any[]> {
  // Simple sequential claim; contention risk is low (single admin bulk run).
  let q = sb.from("seo_reoptimization_items")
    .select("*")
    .in("status", ["queued"])
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (runId) q = q.eq("run_id", runId);
  const { data } = await q;
  return data || [];
}

async function reclaimStale(sb: any) {
  const cutoff = new Date(Date.now() - ITEM_LOCK_MS).toISOString();
  await sb.from("seo_reoptimization_items")
    .update({ status: "queued", locked_at: null })
    .eq("status", "running")
    .lt("started_at", cutoff);
}

async function selfKick(runId: string | null) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/seo-reoptimize-worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(runId ? { run_id: runId } : {}),
    });
  } catch (e) { console.warn("self-kick failed", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const body = await req.json().catch(() => ({}));
  const runId: string | null = body?.run_id || null;

  // Honor cancellation: if the run was cancelled, mark remaining items and stop.
  if (runId) {
    const { data: runRow } = await sb.from("seo_reoptimization_runs")
      .select("cancel_requested,status,run_at").eq("id", runId).maybeSingle();
    if (runRow?.cancel_requested) {
      await sb.from("seo_reoptimization_items")
        .update({ status: "failed", error: "cancelled", finished_at: nowIso() })
        .eq("run_id", runId).in("status", ["queued", "running"]);
      await sb.from("seo_reoptimization_runs")
        .update({ status: "cancelled", finished_at: nowIso() }).eq("id", runId);
      return json(200, { cancelled: true });
    }
    // If still queued but not yet due, do nothing — scheduler will kick when due.
    if (runRow?.status === "queued" && runRow?.run_at && new Date(runRow.run_at) > new Date()) {
      return json(200, { deferred: true, run_at: runRow.run_at });
    }
    // Ensure run is marked running once the worker starts processing it.
    if (runRow?.status === "queued") {
      await sb.from("seo_reoptimization_runs")
        .update({ status: "running", started_at: nowIso() }).eq("id", runId);
    }
  }

  await reclaimStale(sb);
  const batch = await claimNext(sb, runId);

  if (!batch.length) {
    if (runId) await bumpRun(sb, runId);
    return json(200, { drained: true });
  }

  for (const item of batch) {
    // Re-check cancellation between items so long batches stop promptly.
    if (runId) {
      const { data: r } = await sb.from("seo_reoptimization_runs")
        .select("cancel_requested").eq("id", runId).maybeSingle();
      if (r?.cancel_requested) {
        await sb.from("seo_reoptimization_items")
          .update({ status: "failed", error: "cancelled", finished_at: nowIso() })
          .eq("run_id", runId).in("status", ["queued", "running"]);
        await sb.from("seo_reoptimization_runs")
          .update({ status: "cancelled", finished_at: nowIso() }).eq("id", runId);
        return json(200, { cancelled: true, processed: 0 });
      }
    }
    await sb.from("seo_reoptimization_items").update({ locked_at: nowIso() }).eq("id", item.id);
    await processItem(sb, item);
  }

  if (runId) await bumpRun(sb, runId);
  EdgeRuntime.waitUntil(selfKick(runId));
  return json(200, { processed: batch.length });
});

