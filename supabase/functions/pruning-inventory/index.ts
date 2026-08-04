// Content Pruning — Phase 1a: build the page inventory and on-page signals.
//
// POST /pruning-inventory  { run_id?: string, scope?: { types?: string[] } }
// Admin only. Creates (or reuses) a pruning run, rebuilds public.pruning_pages
// for every public URL, then computes duplicate clusters, cannibalization and
// the internal-link graph.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { STATIC_ROUTES } from "../_shared/staticRoutes.ts";
import {
  SITE_URL, type PruningPageInput, type PageType,
  flattenText, stripHtml, wordCount, headingCount, countFaqs,
  readabilityScore, repetitionScore, detectStaleFacts, daysSince,
  shingleSketch, jaccard, hash32, countLinks, normalizeTitleKey,
} from "../_shared/pruning.ts";

const sb = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fetchAll = async (client: any, table: string, columns: string, filters?: (q: any) => any) => {
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q: any = client.from(table).select(columns).range(from, from + pageSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) {
      console.error(`[pruning-inventory] ${table}: ${error.message}`);
      break;
    }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
};

interface Built {
  page: PruningPageInput;
  internalOut: string[];
}

const build = (opts: {
  path: string;
  page_type: PageType;
  source_table: string | null;
  source_id: string | null;
  slug: string | null;
  page_name: string | null;
  htmlFields: unknown[];
  textFields?: unknown[];
  meta_title?: unknown;
  meta_description?: unknown;
  h1?: unknown;
  faq?: unknown;
  schema?: unknown;
  published_at?: string | null;
  content_updated_at?: string | null;
  primary_keyword?: unknown;
  secondary_keyword?: unknown;
  state?: unknown;
  city?: unknown;
  author?: unknown;
  extra?: Record<string, unknown>;
}): Built => {
  const htmlBlob = opts.htmlFields.filter((v) => typeof v === "string").join("\n");
  const text = [
    ...opts.htmlFields.map((v) => flattenText(v)),
    ...(opts.textFields ?? []).map((v) => flattenText(v)),
  ].join(" ").replace(/\s+/g, " ").trim();

  const wc = wordCount(text);
  const links = countLinks(htmlBlob);
  const stale = detectStaleFacts(text);
  const updated = opts.content_updated_at ?? null;

  return {
    internalOut: links.internal,
    page: {
      url: `${SITE_URL}${opts.path}`,
      path: opts.path,
      page_type: opts.page_type,
      source_table: opts.source_table,
      source_id: opts.source_id ? String(opts.source_id) : null,
      slug: opts.slug,
      page_name: opts.page_name,
      state: typeof opts.state === "string" ? opts.state : null,
      city: typeof opts.city === "string" ? opts.city : null,
      author: typeof opts.author === "string" ? opts.author : null,
      meta_title: typeof opts.meta_title === "string" ? opts.meta_title : null,
      meta_description: typeof opts.meta_description === "string" ? opts.meta_description : null,
      h1: typeof opts.h1 === "string" ? opts.h1 : null,
      word_count: wc,
      heading_count: headingCount(htmlBlob),
      faq_count: countFaqs(opts.faq),
      has_schema: Boolean(opts.schema),
      thin_content: wc < 300,
      readability: readabilityScore(text),
      repetition_score: repetitionScore(text),
      stale_facts: stale,
      published_at: opts.published_at ?? null,
      content_updated_at: updated,
      days_since_update: daysSince(updated),
      primary_keyword: typeof opts.primary_keyword === "string" ? opts.primary_keyword : null,
      secondary_keyword: typeof opts.secondary_keyword === "string" ? opts.secondary_keyword : null,
      internal_links_out: links.internal.length,
      content_hash: hash32(text.slice(0, 20000)),
      shingles: shingleSketch(text),
      signals: { external_links: links.total - links.internal.length, ...(opts.extra ?? {}) },
    },
  };
};

const toSlug = (s: string) => (s || "").toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = sb();
  const body = await req.json().catch(() => ({} as any));
  let runId: string | null = body?.run_id ?? null;

  try {
    if (!runId) {
      const { data, error } = await client.from("pruning_runs")
        .insert({ status: "running", phase: "inventory", scope: body?.scope ?? {}, started_at: new Date().toISOString() })
        .select("id").single();
      if (error) throw new Error(`run_create_failed: ${error.message}`);
      runId = data.id;
    } else {
      await client.from("pruning_runs").update({ status: "running", phase: "inventory" }).eq("id", runId);
    }

    /* ------------------------------ load sources ----------------------------- */
    const [
      colleges, institutes, coachingCourses, articles, news, exams,
      categories, cityPages, bundles, compass, overrides,
    ] = await Promise.all([
      fetchAll(client, "colleges", "id, slug, name, description, admission_process, cutoff_info, highlights, fees, placement_avg, meta_title, meta_description, h1_tag, primary_keyword, faqs, city, state, tier, college_category, created_at, updated_at"),
      fetchAll(client, "institutes", "id, slug, name, description, sections, meta_title, meta_description, h1_tag, primary_keyword, faqs, schema_jsonld, city, state, created_at, updated_at"),
      fetchAll(client, "courses", "id, name, institute_id, updated_at, created_at"),
      fetchAll(client, "articles", "id, slug, title, excerpt, intro, content, meta_title, meta_description, h1_tag, primary_keyword, faqs, author, category, created_at, updated_at", (q) => q.eq("published", true)),
      fetchAll(client, "news_articles", "id, slug, headline, one_liner, category, created_at, updated_at"),
      fetchAll(client, "exams", "id, slug, name, description, eligibility, pattern, cutoffs, important_dates, meta_title, meta_description, h1_tag, primary_keyword, faqs, created_at, updated_at"),
      fetchAll(client, "categories", "id, slug, name, description, faqs, updated_at"),
      fetchAll(client, "city_pages", "id, slug, name, state, meta_title, meta_description, intro_content, detailed_content, faq_content, h1_tag, primary_keyword, faqs, created_at, updated_at", (q) => q.eq("active", true)),
      fetchAll(client, "mock_bundles", "id, slug, name, description, features, highlights, updated_at, created_at", (q) => q.eq("is_published", true)),
      fetchAll(client, "mba_compass_courses", "id, slug, title, subtitle, description, curriculum, what_youll_learn, highlights, faqs, meta_title, meta_description, h1_tag, primary_keyword, updated_at, created_at", (q) => q.eq("is_active", true)),
      fetchAll(client, "page_seo_overrides", "slug, title, description, h1, intro_html, body_html, faq, json_ld, primary_keyword, secondary_keyword, keywords, updated_at"),
    ]);

    const overrideBySlug = new Map<string, any>();
    for (const o of overrides) if (o.slug) overrideBySlug.set(String(o.slug), o);

    const built: Built[] = [];

    for (const c of colleges) {
      if (!c.slug || !c.name) continue;
      built.push(build({
        path: `/college/${c.slug}`, page_type: "college", source_table: "colleges", source_id: c.id,
        slug: c.slug, page_name: c.name,
        htmlFields: [c.description, c.admission_process, c.cutoff_info],
        textFields: [c.highlights, c.fees, c.placement_avg],
        meta_title: c.meta_title, meta_description: c.meta_description, h1: c.h1_tag,
        faq: c.faqs, schema: true, primary_keyword: c.primary_keyword,
        city: c.city, state: c.state,
        published_at: c.created_at, content_updated_at: c.updated_at,
        extra: { tier: c.tier, category: c.college_category },
      }));
    }

    const instituteSlugById = new Map<string, string>();
    for (const i of institutes) {
      if (!i.slug || !i.name) continue;
      instituteSlugById.set(i.id, i.slug);
      built.push(build({
        path: `/institute/${i.slug}`, page_type: "institute", source_table: "institutes", source_id: i.id,
        slug: i.slug, page_name: i.name,
        htmlFields: [i.description], textFields: [i.sections],
        meta_title: i.meta_title, meta_description: i.meta_description, h1: i.h1_tag,
        faq: i.faqs, schema: Boolean(i.schema_jsonld), primary_keyword: i.primary_keyword,
        city: i.city, state: i.state,
        published_at: i.created_at, content_updated_at: i.updated_at,
      }));
    }

    for (const cc of coachingCourses) {
      const instSlug = cc.institute_id ? instituteSlugById.get(cc.institute_id) : null;
      const courseSlug = toSlug(cc.name || "");
      if (!instSlug || !courseSlug) continue;
      built.push(build({
        path: `/institute/${instSlug}/course/${courseSlug}`, page_type: "coaching-course",
        source_table: "courses", source_id: cc.id, slug: courseSlug, page_name: cc.name,
        htmlFields: [], published_at: cc.created_at, content_updated_at: cc.updated_at,
      }));
    }

    for (const a of articles) {
      if (!a.slug) continue;
      built.push(build({
        path: `/article/${a.slug}`, page_type: "article", source_table: "articles", source_id: a.id,
        slug: a.slug, page_name: a.title,
        htmlFields: [a.intro, a.content], textFields: [a.excerpt],
        meta_title: a.meta_title, meta_description: a.meta_description, h1: a.h1_tag,
        faq: a.faqs, schema: true, primary_keyword: a.primary_keyword, author: a.author,
        published_at: a.created_at, content_updated_at: a.updated_at,
        extra: { category: a.category },
      }));
    }

    for (const n of news) {
      if (!n.slug) continue;
      built.push(build({
        path: `/news/${n.slug}`, page_type: "news", source_table: "news_articles", source_id: n.id,
        slug: n.slug, page_name: n.headline, htmlFields: [], textFields: [n.one_liner],
        published_at: n.created_at, content_updated_at: n.updated_at, extra: { category: n.category },
      }));
    }

    for (const e of exams) {
      if (!e.slug) continue;
      built.push(build({
        path: `/exam/${e.slug}`, page_type: "exam", source_table: "exams", source_id: e.id,
        slug: e.slug, page_name: e.name,
        htmlFields: [e.description], textFields: [e.eligibility, e.pattern, e.cutoffs, e.important_dates],
        meta_title: e.meta_title, meta_description: e.meta_description, h1: e.h1_tag,
        faq: e.faqs, schema: true, primary_keyword: e.primary_keyword,
        published_at: e.created_at, content_updated_at: e.updated_at,
      }));
    }

    for (const c of categories) {
      if (!c.slug) continue;
      built.push(build({
        path: `/category/${c.slug}`, page_type: "category", source_table: "categories", source_id: c.id,
        slug: c.slug, page_name: c.name, htmlFields: [c.description], faq: c.faqs,
        content_updated_at: c.updated_at,
      }));
    }

    for (const cp of cityPages) {
      if (!cp.slug) continue;
      built.push(build({
        path: `/colleges/${cp.slug}`, page_type: "city", source_table: "city_pages", source_id: cp.id,
        slug: cp.slug, page_name: cp.name,
        htmlFields: [cp.intro_content, cp.detailed_content, cp.faq_content],
        meta_title: cp.meta_title, meta_description: cp.meta_description, h1: cp.h1_tag,
        faq: cp.faqs, primary_keyword: cp.primary_keyword, state: cp.state,
        published_at: cp.created_at, content_updated_at: cp.updated_at,
      }));
    }

    for (const b of bundles) {
      if (!b.slug) continue;
      built.push(build({
        path: `/courses/${b.slug}`, page_type: "course", source_table: "mock_bundles", source_id: b.id,
        slug: b.slug, page_name: b.name, htmlFields: [b.description],
        textFields: [b.features, b.highlights],
        published_at: b.created_at, content_updated_at: b.updated_at,
      }));
    }

    for (const c of compass) {
      if (!c.slug) continue;
      built.push(build({
        path: `/mba-compass/${c.slug}`, page_type: "compass-course", source_table: "mba_compass_courses",
        source_id: c.id, slug: c.slug, page_name: c.title,
        htmlFields: [c.description], textFields: [c.subtitle, c.curriculum, c.what_youll_learn, c.highlights],
        meta_title: c.meta_title, meta_description: c.meta_description, h1: c.h1_tag,
        faq: c.faqs, primary_keyword: c.primary_keyword,
        published_at: c.created_at, content_updated_at: c.updated_at,
      }));
    }

    for (const r of STATIC_ROUTES) {
      const ov = overrideBySlug.get(`static:${r.path}`) ?? overrideBySlug.get(r.path);
      built.push(build({
        path: r.path, page_type: "static", source_table: null, source_id: null,
        slug: r.path, page_name: r.path === "/" ? "Home" : r.path,
        htmlFields: [ov?.intro_html, ov?.body_html],
        meta_title: ov?.title, meta_description: ov?.description, h1: ov?.h1,
        faq: ov?.faq, schema: Boolean(ov?.json_ld),
        primary_keyword: ov?.primary_keyword, secondary_keyword: ov?.secondary_keyword,
        content_updated_at: ov?.updated_at ?? null,
        extra: { static_route: true },
      }));
    }

    // Merge per-page SEO overrides into DB-backed pages too (keywords + extra copy).
    for (const b of built) {
      const ov = overrideBySlug.get(b.page.path) ?? (b.page.slug ? overrideBySlug.get(b.page.slug) : null);
      if (!ov) continue;
      b.page.primary_keyword ||= ov.primary_keyword ?? null;
      b.page.secondary_keyword ||= ov.secondary_keyword ?? null;
      b.page.meta_title ||= ov.title ?? null;
      b.page.meta_description ||= ov.description ?? null;
      const extraWords = wordCount(stripHtml(ov.body_html) + " " + stripHtml(ov.intro_html));
      if (extraWords) {
        b.page.word_count += extraWords;
        b.page.thin_content = b.page.word_count < 300;
      }
    }

    /* --------------------------- internal link graph -------------------------- */
    const inboundByPath = new Map<string, number>();
    for (const b of built) {
      for (const p of new Set(b.internalOut)) {
        if (p === b.page.path) continue;
        inboundByPath.set(p, (inboundByPath.get(p) ?? 0) + 1);
      }
    }

    /* ------------------------------ duplicates ------------------------------- */
    const clusters: {
      cluster_type: string; signature: string | null; member_urls: string[];
      survivor_url: string | null; similarity: number | null; notes: string | null;
    }[] = [];
    const clusterOfUrl = new Map<string, number>();

    const addCluster = (type: string, members: string[], similarity: number | null, signature: string | null, notes: string) => {
      if (members.length < 2) return;
      const idx = clusters.length;
      clusters.push({
        cluster_type: type, signature, member_urls: members,
        survivor_url: members[0], similarity, notes,
      });
      for (const m of members) if (!clusterOfUrl.has(m)) clusterOfUrl.set(m, idx);
    };

    // Exact duplicates by content hash (ignore near-empty pages)
    const byHash = new Map<string, Built[]>();
    for (const b of built) {
      if (b.page.word_count < 120) continue;
      const arr = byHash.get(b.page.content_hash) ?? [];
      arr.push(b);
      byHash.set(b.page.content_hash, arr);
    }
    for (const [h, arr] of byHash) {
      if (arr.length > 1) {
        addCluster("exact_duplicate", arr.map((x) => x.page.url), 1, h, "Identical rendered copy");
      }
    }

    // Near duplicates within the same page type, bucketed by shared shingle to
    // keep the comparison cheap across 1000+ pages.
    const byType = new Map<string, Built[]>();
    for (const b of built) {
      if (b.page.shingles.length < 8 || clusterOfUrl.has(b.page.url)) continue;
      const arr = byType.get(b.page.page_type) ?? [];
      arr.push(b);
      byType.set(b.page.page_type, arr);
    }
    for (const [type, arr] of byType) {
      const buckets = new Map<string, Built[]>();
      for (const b of arr) {
        for (const s of b.page.shingles.slice(0, 8)) {
          const list = buckets.get(s) ?? [];
          list.push(b);
          buckets.set(s, list);
        }
      }
      const seenPair = new Set<string>();
      for (const list of buckets.values()) {
        if (list.length < 2 || list.length > 40) continue;
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i], b = list[j];
            const key = [a.page.url, b.page.url].sort().join("|");
            if (seenPair.has(key)) continue;
            seenPair.add(key);
            if (clusterOfUrl.has(a.page.url) && clusterOfUrl.has(b.page.url)) continue;
            const sim = jaccard(a.page.shingles, b.page.shingles);
            if (sim >= 0.78) {
              const survivor = (a.page.word_count >= b.page.word_count ? a : b).page.url;
              const other = survivor === a.page.url ? b.page.url : a.page.url;
              addCluster("near_duplicate", [survivor, other], Math.round(sim * 1000) / 1000, null,
                `${Math.round(sim * 100)}% content overlap within ${type} pages`);
            }
          }
        }
      }
    }

    // Duplicate titles / descriptions / H1s
    const dupByField = (field: "meta_title" | "meta_description" | "h1", type: string, label: string) => {
      const map = new Map<string, string[]>();
      for (const b of built) {
        const key = normalizeTitleKey(b.page[field]);
        if (!key || key.length < 12) continue;
        const arr = map.get(key) ?? [];
        arr.push(b.page.url);
        map.set(key, arr);
      }
      for (const [key, urls] of map) {
        if (urls.length > 1) addCluster(type, urls, null, key.slice(0, 80), label);
      }
    };
    dupByField("meta_title", "duplicate_title", "Identical meta title");
    dupByField("meta_description", "duplicate_description", "Identical meta description");
    dupByField("h1", "duplicate_h1", "Identical H1");

    /* --------------------------- cannibalization ---------------------------- */
    const cannibalByUrl = new Map<string, string[]>();
    const kwMap = new Map<string, Built[]>();
    for (const b of built) {
      const kw = (b.page.primary_keyword || "").toLowerCase().trim();
      if (!kw || kw.length < 4) continue;
      const arr = kwMap.get(kw) ?? [];
      arr.push(b);
      kwMap.set(kw, arr);
    }
    for (const [, arr] of kwMap) {
      if (arr.length < 2) continue;
      const sorted = [...arr].sort((x, y) => y.page.word_count - x.page.word_count);
      for (const b of sorted.slice(1)) {
        cannibalByUrl.set(b.page.url, sorted.filter((x) => x !== b).map((x) => x.page.url).slice(0, 4));
      }
    }

    /* -------------------------------- persist -------------------------------- */
    // Insert clusters first so pages can reference them.
    await client.from("pruning_duplicate_clusters").delete().not("id", "is", null);
    const clusterIds: (string | null)[] = clusters.map(() => null);
    if (clusters.length) {
      const { data: inserted, error } = await client.from("pruning_duplicate_clusters")
        .insert(clusters.map((c) => ({ ...c, run_id: runId })))
        .select("id, member_urls, cluster_type");
      if (error) console.error("[pruning-inventory] clusters:", error.message);
      (inserted ?? []).forEach((row: any, i: number) => { clusterIds[i] = row.id; });
    }
    const clusterIdOfUrl = new Map<string, string>();
    for (const [url, idx] of clusterOfUrl) {
      const id = clusterIds[idx];
      if (id) clusterIdOfUrl.set(url, id);
    }

    const nowIso = new Date().toISOString();
    const rows = built.map((b) => ({
      ...b.page,
      run_id: runId,
      internal_links_in: inboundByPath.get(b.page.path) ?? 0,
      is_orphan: (inboundByPath.get(b.page.path) ?? 0) === 0 && b.page.path !== "/",
      duplicate_cluster_id: clusterIdOfUrl.get(b.page.url) ?? null,
      signals: {
        ...b.page.signals,
        cannibal_urls: cannibalByUrl.get(b.page.url) ?? [],
        inventoried_at: nowIso,
      },
      signals_at: null,
      analyzed_at: null,
    }));

    // Drop inventory rows for URLs that no longer exist, then upsert the rest.
    const liveUrls = new Set(rows.map((r) => r.url));
    const { data: existing } = await client.from("pruning_pages").select("id, url");
    const stale = (existing ?? []).filter((e: any) => !liveUrls.has(e.url)).map((e: any) => e.id);
    for (let i = 0; i < stale.length; i += 500) {
      await client.from("pruning_pages").delete().in("id", stale.slice(i, i + 500));
    }

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300);
      const { error } = await client.from("pruning_pages").upsert(chunk, { onConflict: "url" });
      if (error) console.error("[pruning-inventory] upsert:", error.message);
      else upserted += chunk.length;
    }

    const summary = {
      total_pages: rows.length,
      thin: rows.filter((r) => r.thin_content).length,
      orphans: rows.filter((r) => r.is_orphan).length,
      stale: rows.filter((r) => (r.stale_facts?.length ?? 0) > 0).length,
      duplicate_clusters: clusters.length,
      cannibalization: cannibalByUrl.size,
      by_type: rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.page_type] = (acc[r.page_type] ?? 0) + 1;
        return acc;
      }, {}),
    };

    await client.from("pruning_runs").update({
      phase: "signals",
      total_pages: rows.length,
      inventoried_count: upserted,
      summary,
      removed_stale: undefined,
    }).eq("id", runId);

    return json({ ok: true, run_id: runId, ...summary, removed: stale.length });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[pruning-inventory] failed:", msg);
    if (runId) {
      await sb().from("pruning_runs").update({ status: "failed", error: msg, finished_at: new Date().toISOString() }).eq("id", runId);
    }
    return json({ error: "inventory_failed", details: msg }, 500);
  }
});
