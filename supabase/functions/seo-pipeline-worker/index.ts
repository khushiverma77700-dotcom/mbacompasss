// seo-pipeline-worker — automatic post-publish SEO pipeline.
//
// Every newly created page (colleges, institutes, articles, exams, city pages,
// bundles, compass courses) is queued by a database trigger. This worker drains
// the queue and, per page, runs:
//
//   1. Health scoring         (content, schema, intent, entities, performance)
//   2. Duplication check      (shingle similarity vs same-type pages)
//   3. Schema validation      (required JSON-LD fields present and coherent)
//   4. Entity coverage check  (entities detected vs expected for the page type)
//   5. Decay monitoring queue (registers the page for future decay checks)
//
// It can also be invoked directly for a single path (`path` or `source_id`),
// which is what the "Run pipeline now" dashboard button uses.

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import {
  cors, json, loadSettings, loadPages, shingles, similarity, classifyIntent,
  countMentions, scoreHealth, clamp100, normalizeEntity,
} from "../_shared/seoSignals.ts";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const REQUIRED_SCHEMA_TYPES: Record<string, string[]> = {
  college: ["CollegeOrUniversity", "EducationalOrganization"],
  institute: ["EducationalOrganization", "LocalBusiness", "Organization"],
  article: ["Article", "BlogPosting", "NewsArticle"],
  exam: ["Event", "EducationalOccupationalCredential", "Course", "FAQPage"],
  city: ["CollectionPage", "ItemList", "WebPage"],
  course: ["Course", "Product"],
  "compass-course": ["Course", "Product"],
  category: ["CollectionPage", "ItemList", "WebPage"],
};

function validateSchema(pageType: string, jsonLd: any, faq: any): { valid: boolean; issues: string[]; faqCount: number } {
  const issues: string[] = [];
  const faqList = Array.isArray(faq) ? faq : Array.isArray(faq?.items) ? faq.items : [];
  const blobs: any[] = [];
  const walk = (node: any, depth = 0) => {
    if (!node || depth > 3) return;
    if (Array.isArray(node)) { node.forEach((n) => walk(n, depth + 1)); return; }
    if (typeof node === "object") {
      if (node["@type"]) blobs.push(node);
      Object.values(node).forEach((v) => walk(v, depth + 1));
    }
  };
  walk(jsonLd);

  if (blobs.length === 0) {
    issues.push("No JSON-LD structured data found for this page.");
    return { valid: false, issues, faqCount: faqList.length };
  }

  const types = blobs.flatMap((b) => (Array.isArray(b["@type"]) ? b["@type"] : [b["@type"]]));
  const expected = REQUIRED_SCHEMA_TYPES[pageType] ?? [];
  if (expected.length && !expected.some((t) => types.includes(t))) {
    issues.push(`Missing a primary schema type for ${pageType} (expected one of ${expected.join(", ")}).`);
  }
  for (const b of blobs) {
    if (!b.name && !b.headline) issues.push(`Schema block "${b["@type"]}" has no name/headline.`);
  }
  if (faqList.length >= 3 && !types.includes("FAQPage")) {
    issues.push("Page has FAQs but no FAQPage schema (AEO opportunity).");
  }

  return { valid: issues.length === 0, issues, faqCount: faqList.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const isCron = body?.cron_secret && body.cron_secret === Deno.env.get("CRON_SECRET");
  if (!isCron) {
    const denied = await requireAdmin(req, cors);
    if (denied) return denied;
  }

  const sb = admin();

  try {
    const settings = await loadSettings(sb);
    if (!settings.postpublish_enabled && isCron) {
      return json({ skipped: true, reason: "Post-publish pipeline is disabled in settings." });
    }

    const limit = Math.min(Number(body.limit ?? 5), 10);
    let items: any[] = [];

    if (body.path || body.source_id) {
      // Ad-hoc single-page run from the dashboard.
      const { data } = await sb.from("seo_pipeline_queue")
        .insert({
          source_table: body.source_table ?? "manual",
          source_id: body.source_id ?? crypto.randomUUID(),
          path: body.path ?? null,
          page_type: body.page_type ?? null,
          event: "manual",
          status: "processing",
          attempts: 1,
          claimed_at: new Date().toISOString(),
        })
        .select("*").single();
      if (data) items = [data];
    } else {
      const { data } = await sb.rpc("claim_seo_pipeline_items", { p_limit: limit });
      items = data ?? [];
    }

    if (!items.length) return json({ processed: 0, note: "Queue is empty." });

    const pages = await loadPages(sb);
    const pageByPath = new Map(pages.map((p) => [p.path, p]));

    // Pre-compute shingles per page type lazily for duplication checks.
    const typeShingles = new Map<string, Array<{ path: string; set: Set<string> }>>();
    const shinglesFor = (pageType: string) => {
      let list = typeShingles.get(pageType);
      if (!list) {
        list = pages
          .filter((p) => p.page_type === pageType && p.words > 120)
          .slice(0, 300)
          .map((p) => ({ path: p.path, set: shingles(p.text) }));
        typeShingles.set(pageType, list);
      }
      return list;
    };

    const results: any[] = [];

    for (const item of items) {
      try {
        const page = item.path ? pageByPath.get(item.path) : undefined;
        if (!page) throw new Error(`Page not found for path ${item.path ?? "(none)"} — it may be unpublished.`);

        /* 1. duplication */
        const mySet = shingles(page.text);
        let dupPath: string | null = null;
        let dupSim = 0;
        for (const other of shinglesFor(page.page_type)) {
          if (other.path === page.path) continue;
          const s = similarity(mySet, other.set);
          if (s > dupSim) { dupSim = s; dupPath = other.path; }
        }
        const duplicationScore = clamp100(dupSim * 100);

        /* 2. schema + meta overrides */
        const { data: override } = await sb.from("page_seo_overrides")
          .select("title, description, faq, json_ld, primary_keyword").eq("slug", page.path).maybeSingle();
        const schema = validateSchema(page.page_type, override?.json_ld ?? null, override?.faq ?? null);

        /* 3. entity coverage */
        const { data: entities } = await sb.from("seo_entities")
          .select("id, name, aliases, entity_type, importance")
          .order("importance", { ascending: false }).limit(400);
        let matched = 0;
        const entityRows: any[] = [];
        for (const ent of entities ?? []) {
          const n = countMentions(page.text, ent.name, (ent.aliases ?? []) as string[]);
          if (n > 0) {
            matched++;
            entityRows.push({ path: page.path, entity_id: ent.id, mentions: n, prominence: clamp100(n * 10) });
          }
          if (matched >= 25) break;
        }
        if (entityRows.length) {
          await sb.from("page_entities").upsert(entityRows, { onConflict: "path,entity_id" });
        }
        const expectedEntities = page.page_type === "article" ? 8 : 5;
        const entityCoverage = clamp100((matched / expectedEntities) * 100);

        /* 4. performance + decay state */
        const { data: metrics } = await sb.from("gsc_page_metrics")
          .select("window_label, clicks, impressions, ctr, avg_position").eq("path", page.path);
        const cur = (metrics ?? []).find((m: any) => m.window_label === "current");
        const prev = (metrics ?? []).find((m: any) => m.window_label === "previous");
        const decayState = !prev || (prev.clicks ?? 0) < 5
          ? "unknown"
          : (cur?.clicks ?? 0) < prev.clicks * (1 - settings.decay_click_drop_pct / 100)
            ? "decaying"
            : (cur?.clicks ?? 0) > prev.clicks ? "growing" : "stable";

        /* 5. internal link count */
        const internalLinks = (page.html.match(/href="\//g) ?? []).length;

        /* 6. health score */
        const keyword = page.keyword ?? override?.primary_keyword ?? null;
        const health = scoreHealth({
          words: page.words,
          hasTitle: Boolean(override?.title),
          hasDescription: Boolean(override?.description),
          hasKeyword: Boolean(keyword),
          schemaValid: schema.valid,
          faqCount: schema.faqCount,
          internalLinks,
          duplicationScore,
          entityCoverage,
          clicks: cur?.clicks ?? 0,
          impressions: cur?.impressions ?? 0,
          ctr: cur?.ctr ?? 0,
          position: cur?.avg_position ?? null,
          decayState,
        });

        const issues = [...health.issues, ...schema.issues];
        if (duplicationScore >= 70 && dupPath) {
          issues.push(`Near-duplicate of ${dupPath} (${duplicationScore}% overlap) — split intents or consolidate.`);
        }

        await sb.from("seo_page_health").upsert({
          path: page.path,
          url: `https://mbacompass.in${page.path}`,
          page_type: page.page_type,
          page_name: page.name,
          source_table: page.source_table,
          source_id: page.source_id,
          health_score: health.health_score,
          content_score: health.content_score,
          schema_score: health.schema_score,
          intent_score: health.intent_score,
          duplication_score: duplicationScore,
          entity_score: entityCoverage,
          entity_coverage: entityCoverage,
          word_count: page.words,
          schema_valid: schema.valid,
          schema_issues: schema.issues,
          duplicate_of: duplicationScore >= 45 ? dupPath : null,
          duplicate_similarity: duplicationScore,
          detected_intent: keyword ? classifyIntent(keyword) : classifyIntent(page.name ?? ""),
          primary_keyword: keyword,
          decay_state: decayState,
          clicks: cur?.clicks ?? 0,
          impressions: cur?.impressions ?? 0,
          ctr: cur?.ctr ?? 0,
          avg_position: cur?.avg_position ?? null,
          issues,
          signals: { internal_links: internalLinks, entities_matched: matched, faq_count: schema.faqCount },
          last_checked_at: new Date().toISOString(),
        }, { onConflict: "path" });

        /* 7. register for decay monitoring so the next decay run picks it up */
        await sb.from("decay_pages").upsert({
          run_id: null,
          path: page.path,
          page_type: page.page_type,
          page_name: page.name,
          source_table: page.source_table,
          source_id: page.source_id,
          source_field: page.source_field,
          decay_state: decayState === "unknown" ? "stable" : decayState,
          monitoring: true,
        }, { onConflict: "run_id,path", ignoreDuplicates: true });

        await sb.from("seo_pipeline_queue").update({
          status: "completed",
          stages_done: ["duplication", "schema", "entities", "health", "decay_monitoring"],
          health_score: health.health_score,
          duplication_found: duplicationScore >= 70,
          schema_valid: schema.valid,
          result: {
            health: health.health_score,
            content: health.content_score,
            schema: health.schema_score,
            intent: health.intent_score,
            entity_coverage: entityCoverage,
            duplicate_of: dupPath,
            duplication_score: duplicationScore,
            internal_links: internalLinks,
            issues,
          },
          completed_at: new Date().toISOString(),
          error: null,
        }).eq("id", item.id);

        results.push({ path: page.path, health: health.health_score, issues: issues.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await sb.from("seo_pipeline_queue").update({
          status: item.attempts >= 3 ? "failed" : "queued",
          error: msg,
        }).eq("id", item.id);
        results.push({ path: item.path, error: msg });
      }
    }

    return json({ processed: items.length, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seo-pipeline-worker]", msg);
    return json({ error: msg }, 500);
  }
});
