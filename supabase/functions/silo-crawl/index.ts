// Reverse Siloing — stage 1: crawl the site's own content and build the
// internal link graph.
//
// POST /silo-crawl
//   { run_id?: string, stage?: "pages" | "graph", group?: number, triggered_by?: string }
//
// Admin only. Runs in small groups so each invocation stays inside the edge
// function CPU budget. The caller keeps calling with the returned next_group
// until next_stage is "graph", then calls the graph stage once.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import {
  SITE_URL, SILO_SOURCES, COMMERCIAL_TYPES, type SiloPageInput, type SiloEdge,
  extractLinks, flattenText, wordCount, toSlug, pageRank, anchorDiversity, clamp,
} from "../_shared/silo.ts";

const sb = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ANALYSIS_CHARS = 12000;
const COLLEGE_PARTS = 3;
const COLLEGE_SIZE = 250;

interface Built { page: SiloPageInput; edges: SiloEdge[] }

const fetchAll = async (client: any, table: string, columns: string, filter?: (q: any) => any) => {
  const all: any[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q: any = client.from(table).select(columns).range(from, from + size - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`[silo-crawl] ${table}: ${error.message}`); break; }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < size) break;
  }
  return all;
};

const buildRows = (src: typeof SILO_SOURCES[number], rows: any[]): Built[] => {
  const out: Built[] = [];
  for (const row of rows) {
    const path = src.pathFor(row, {});
    const name = src.nameFor(row);
    if (!path || !name) continue;

    const htmlFields = src.htmlFor(row).filter(Boolean) as unknown[];
    const edgeMap = new Map<string, SiloEdge>();
    for (const html of htmlFields) {
      for (const link of extractLinks(html)) {
        if (link.path === path) continue;
        edgeMap.set(`${link.path}|${link.anchor.toLowerCase()}`, {
          from_path: path, to_path: link.path, anchor_text: link.anchor || null,
        });
      }
    }

    const text = [
      ...htmlFields.map((h) => flattenText(h)),
      ...(src.textFor ? src.textFor(row).map((t) => flattenText(t)) : []),
    ].join(" ").slice(0, ANALYSIS_CHARS);

    out.push({
      page: {
        url: `${SITE_URL}${path}`,
        path,
        page_type: src.page_type,
        source_table: src.table,
        source_id: String(row.id),
        source_field: src.field,
        slug: row.slug ?? null,
        page_name: name,
        topic: src.topicFor?.(row) ?? null,
        primary_keyword: src.keywordFor?.(row) ?? null,
        word_count: wordCount(text),
        is_commercial: COMMERCIAL_TYPES.includes(src.page_type),
        links_out: edgeMap.size,
        signals: { source: src.name, has_body: htmlFields.length > 0 },
      },
      edges: Array.from(edgeMap.values()),
    });
  }
  return out;
};

type GroupFn = (client: any) => Promise<Built[]>;

const GROUPS: { name: string; run: GroupFn }[] = [
  ...Array.from({ length: COLLEGE_PARTS }, (_, part) => ({
    name: `colleges (${part + 1}/${COLLEGE_PARTS})`,
    run: async (client: any) => {
      const src = SILO_SOURCES.find((s) => s.name === "colleges")!;
      const { data, error } = await client.from(src.table).select(src.columns)
        .order("id", { ascending: true })
        .range(part * COLLEGE_SIZE, part * COLLEGE_SIZE + COLLEGE_SIZE - 1);
      if (error) { console.error(`[silo-crawl] colleges ${part}: ${error.message}`); return []; }
      return buildRows(src, data ?? []);
    },
  })),
  ...SILO_SOURCES.filter((s) => s.name !== "colleges").map((src) => ({
    name: src.name,
    run: async (client: any) => buildRows(src, await fetchAll(client, src.table, src.columns, src.filter)),
  })),
  {
    // Coaching course pages are link TARGETS (no editable body of their own).
    name: "coaching-courses",
    run: async (client: any) => {
      const institutes = await fetchAll(client, "institutes", "id, slug");
      const slugById = new Map<string, string>();
      for (const i of institutes) if (i.slug) slugById.set(i.id, i.slug);
      const rows = await fetchAll(client, "courses", "id, name, institute_id");
      const out: Built[] = [];
      for (const c of rows) {
        const instSlug = c.institute_id ? slugById.get(c.institute_id) : null;
        const courseSlug = toSlug(c.name || "");
        if (!instSlug || !courseSlug) continue;
        const path = `/institute/${instSlug}/course/${courseSlug}`;
        out.push({
          page: {
            url: `${SITE_URL}${path}`, path, page_type: "coaching-course",
            source_table: "courses", source_id: String(c.id), source_field: null,
            slug: courseSlug, page_name: c.name, topic: c.name, primary_keyword: null,
            word_count: 0, is_commercial: true, links_out: 0,
            signals: { source: "coaching-courses", target_only: true },
          },
          edges: [],
        });
      }
      return out;
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = sb();
  const body = await req.json().catch(() => ({} as any));
  let runId: string | null = body?.run_id ?? null;
  const stage: string = body?.stage ?? "pages";
  const group: number = Number.isFinite(body?.group) ? Number(body.group) : 0;

  try {
    if (!runId) {
      const { data, error } = await client.from("silo_runs").insert({
        status: "running", stage: "crawl",
        triggered_by: body?.triggered_by ?? "admin",
        scope: body?.scope ?? {},
      }).select("id").single();
      if (error) throw new Error(`run_create_failed: ${error.message}`);
      runId = data.id;
    }

    /* ------------------------------ stage: pages ----------------------------- */
    if (stage === "pages") {
      const g = GROUPS[group];
      if (!g) {
        return json({ ok: true, run_id: runId, stage, done: true, next_stage: "graph", total_groups: GROUPS.length });
      }
      const built = await g.run(client);

      if (built.length) {
        const pageRows = built.map((b) => ({ run_id: runId, ...b.page }));
        for (let i = 0; i < pageRows.length; i += 300) {
          const { error } = await client.from("silo_pages")
            .upsert(pageRows.slice(i, i + 300), { onConflict: "run_id,path" });
          if (error) console.error("[silo-crawl] pages upsert:", error.message);
        }
        const edgeRows = built.flatMap((b) => b.edges.map((e) => ({ run_id: runId, ...e })));
        for (let i = 0; i < edgeRows.length; i += 500) {
          const { error } = await client.from("silo_links").insert(edgeRows.slice(i, i + 500));
          if (error) console.error("[silo-crawl] links insert:", error.message);
        }
      }

      const next = group + 1;
      const done = next >= GROUPS.length;
      await client.from("silo_runs").update({
        stage: done ? "graph" : "crawl",
      }).eq("id", runId);

      return json({
        ok: true, run_id: runId, stage, group, group_name: g.name,
        pages: built.length, edges: built.reduce((a, b) => a + b.edges.length, 0),
        next_group: done ? null : next, next_stage: done ? "graph" : "pages",
        total_groups: GROUPS.length, done,
      });
    }

    /* ------------------------------ stage: graph ----------------------------- */
    const pages = await fetchAll(client, "silo_pages",
      "id, path, page_type, page_name, is_commercial, word_count", (q) => q.eq("run_id", runId));
    const edges = await fetchAll(client, "silo_links",
      "from_path, to_path, anchor_text", (q) => q.eq("run_id", runId));

    const known = new Set(pages.map((p: any) => p.path));
    const internal = edges.filter((e: any) => known.has(e.to_path) && known.has(e.from_path));

    const inbound = new Map<string, string[]>();
    const sources = new Map<string, Set<string>>();
    const outCount = new Map<string, number>();
    for (const e of internal) {
      if (!inbound.has(e.to_path)) inbound.set(e.to_path, []);
      inbound.get(e.to_path)!.push(e.anchor_text ?? "");
      if (!sources.has(e.to_path)) sources.set(e.to_path, new Set());
      sources.get(e.to_path)!.add(e.from_path);
      outCount.set(e.from_path, (outCount.get(e.from_path) ?? 0) + 1);
    }

    const pr = pageRank(pages.map((p: any) => p.path), internal);

    // Blend in Search Console + traffic signals from the latest pruning run.
    const gsc = new Map<string, any>();
    const { data: lastPruning } = await client.from("pruning_runs")
      .select("id").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (lastPruning?.id) {
      const rows = await fetchAll(client, "pruning_pages",
        "path, clicks, impressions, avg_position", (q) => q.eq("run_id", lastPruning.id));
      for (const r of rows) gsc.set(r.path, r);
    }

    const updates = pages.map((p: any) => {
      const inb = inbound.get(p.path) ?? [];
      const uniq = sources.get(p.path)?.size ?? 0;
      const out = outCount.get(p.path) ?? 0;
      const rank = pr.get(p.path) ?? 0;
      const authority = clamp(Math.round(rank * 100));
      const g = gsc.get(p.path);
      const impressions = g?.impressions ?? 0;
      const clicks = g?.clicks ?? 0;
      const pos = g?.avg_position ?? null;

      // Hubs: content-rich informational pages that already pass authority.
      const hubScore = clamp(Math.round(
        authority * 0.55 +
        Math.min(30, out * 3) +
        Math.min(15, p.word_count / 120),
      ));

      // Opportunity: commercial pages with demand but starved of internal links.
      const demand = Math.min(40, Math.log10(impressions + 1) * 16);
      const nearMiss = pos && pos > 4 && pos <= 30 ? 20 : 0;
      const starved = Math.max(0, 25 - uniq * 4);
      const opportunity = p.is_commercial
        ? clamp(Math.round(demand + nearMiss + starved + (uniq === 0 ? 15 : 0)))
        : clamp(Math.round(demand * 0.4 + (uniq === 0 ? 20 : 0)));

      return {
        id: p.id,
        links_in: inb.length,
        links_out: out,
        unique_sources: uniq,
        pagerank: Math.round(rank * 10000) / 10000,
        authority_score: authority,
        anchor_diversity: anchorDiversity(inb),
        is_orphan: uniq === 0 && p.path !== "/",
        is_hub: hubScore >= 55 && !p.is_commercial,
        hub_score: hubScore,
        opportunity_score: opportunity,
        clicks, impressions, avg_position: pos,
      };
    });

    for (let i = 0; i < updates.length; i += 200) {
      const { error } = await client.from("silo_pages").upsert(updates.slice(i, i + 200));
      if (error) console.error("[silo-crawl] graph upsert:", error.message);
    }

    const orphans = updates.filter((u) => u.is_orphan).length;
    const weakHubs = updates.filter((u) => !u.is_hub && u.links_out === 0).length;
    const summary = {
      pages: pages.length,
      edges: internal.length,
      orphans,
      weak_hubs: weakHubs,
      commercial_pages: pages.filter((p: any) => p.is_commercial).length,
      starved_commercial: updates.filter((u, i) => pages[i].is_commercial && u.unique_sources < 3).length,
      avg_authority: Math.round(updates.reduce((a, u) => a + u.authority_score, 0) / Math.max(1, updates.length)),
      gsc_linked: gsc.size,
    };

    await client.from("silo_runs").update({
      stage: "analyze",
      pages_scanned: pages.length,
      edges_found: internal.length,
      orphans,
      weak_hubs: weakHubs,
      summary,
    }).eq("id", runId);

    return json({ ok: true, run_id: runId, stage: "graph", done: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[silo-crawl]", message);
    if (runId) {
      await client.from("silo_runs").update({
        status: "failed", error: message, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: message }, 500);
  }
});
