// Reverse Siloing — stage 2: authority analysis + AI link recommendations.
//
// POST /silo-analyze
//   { run_id: string, cursor?: number, batch?: number }
//
// Admin only. Each invocation handles a small batch of commercial target pages
// so the CPU budget is never exceeded. Returns next_cursor until done.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { logAIUsage } from "../_shared/aiUsageLog.ts";
import { SILO_SOURCES, flattenText, clamp } from "../_shared/silo.ts";

const sb = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MODEL = "gemini-2.5-flash";
const TARGETS_PER_CALL = 5;
const CANDIDATES_PER_TARGET = 6;
const EXCERPT_CHARS = 1400;

const tokens = (s: unknown): Set<string> =>
  new Set(String(s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/).filter((w) => w.length > 3));

const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
};

/** Load the editable body text for a page so anchors can be validated. */
const loadBodies = async (client: any, pages: any[]) => {
  const byTable = new Map<string, any[]>();
  for (const p of pages) {
    if (!p.source_table || !p.source_id || !p.source_field) continue;
    if (!byTable.has(p.source_table)) byTable.set(p.source_table, []);
    byTable.get(p.source_table)!.push(p);
  }
  const bodies = new Map<string, string>();
  for (const [table, rows] of byTable) {
    const src = SILO_SOURCES.find((s) => s.table === table);
    if (!src) continue;
    const ids = rows.map((r) => r.source_id);
    const { data, error } = await client.from(table).select(`id, ${src.field}`).in("id", ids);
    if (error) { console.error(`[silo-analyze] bodies ${table}: ${error.message}`); continue; }
    for (const row of data ?? []) {
      bodies.set(`${table}:${row.id}`, flattenText(row[src.field]).slice(0, EXCERPT_CHARS));
    }
  }
  return bodies;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = sb();
  const body = await req.json().catch(() => ({} as any));
  const runId: string | undefined = body?.run_id;
  const cursor: number = Number.isFinite(body?.cursor) ? Number(body.cursor) : 0;
  const batch: number = Number.isFinite(body?.batch) ? Number(body.batch) : TARGETS_PER_CALL;

  if (!runId) return json({ error: "run_id required" }, 400);

  try {
    const { data: settings } = await client.from("silo_settings").select("*").eq("id", true).maybeSingle();
    const minScore = Number(settings?.min_opportunity_score ?? 60);
    const maxPerPage = Number(settings?.max_links_per_page ?? 3);

    // Commercial targets that need authority, weakest-linked and highest-demand first.
    const { data: targets, error: tErr } = await client.from("silo_pages")
      .select("id, path, page_name, page_type, topic, primary_keyword, unique_sources, authority_score, opportunity_score, impressions, avg_position, is_orphan")
      .eq("run_id", runId).eq("is_commercial", true)
      .order("opportunity_score", { ascending: false })
      .range(cursor, cursor + batch - 1);
    if (tErr) throw new Error(`targets: ${tErr.message}`);

    if (!targets?.length) {
      const { count } = await client.from("silo_link_recommendations")
        .select("id", { count: "exact", head: true }).eq("run_id", runId);
      await client.from("silo_runs").update({
        status: "completed", stage: "done", recommendations: count ?? 0,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
      return json({ ok: true, run_id: runId, done: true, next_cursor: null, recommendations: count ?? 0 });
    }

    // Authority sources: informational, content-rich, already receiving links.
    const { data: hubs, error: hErr } = await client.from("silo_pages")
      .select("id, path, page_name, page_type, topic, primary_keyword, authority_score, hub_score, links_out, word_count, source_table, source_id, source_field")
      .eq("run_id", runId).eq("is_commercial", false)
      .gt("word_count", 120)
      .order("authority_score", { ascending: false })
      .limit(400);
    if (hErr) throw new Error(`hubs: ${hErr.message}`);

    const existing = new Set<string>();
    const { data: links } = await client.from("silo_links")
      .select("from_path, to_path").eq("run_id", runId)
      .in("to_path", targets.map((t: any) => t.path));
    for (const l of links ?? []) existing.add(`${l.from_path}->${l.to_path}`);

    const { data: alreadyRec } = await client.from("silo_link_recommendations")
      .select("source_path, target_path").eq("run_id", runId)
      .in("target_path", targets.map((t: any) => t.path));
    for (const r of alreadyRec ?? []) existing.add(`${r.source_path}->${r.target_path}`);

    let created = 0;
    let aiCalls = 0;

    for (const target of targets) {
      const tTok = tokens(`${target.page_name} ${target.topic ?? ""} ${target.primary_keyword ?? ""}`);
      const candidates = (hubs ?? [])
        .filter((h: any) => h.source_field && !existing.has(`${h.path}->${target.path}`))
        .map((h: any) => ({
          ...h,
          relevance: overlap(tTok, tokens(`${h.page_name} ${h.topic ?? ""} ${h.primary_keyword ?? ""}`)),
        }))
        .sort((a: any, b: any) =>
          (b.relevance - a.relevance) || (b.authority_score - a.authority_score))
        .slice(0, CANDIDATES_PER_TARGET)
        .filter((c: any) => c.relevance > 0 || c.authority_score >= 40);

      if (!candidates.length) continue;

      const bodies = await loadBodies(client, candidates);
      const usable = candidates.filter((c: any) => (bodies.get(`${c.source_table}:${c.source_id}`) ?? "").length > 200);
      if (!usable.length) continue;

      const prompt = [
        `You are an enterprise SEO strategist applying REVERSE SILOING to mbacompass.in (Indian MBA admissions).`,
        `Goal: pass topical authority from high-authority informational pages to a commercial page.`,
        ``,
        `COMMERCIAL TARGET`,
        `URL: ${target.path}`,
        `Name: ${target.page_name}`,
        `Type: ${target.page_type}`,
        `Primary keyword: ${target.primary_keyword ?? "(none set)"}`,
        `Current internal linking sources: ${target.unique_sources} | authority ${target.authority_score}/100 | impressions ${target.impressions} | avg position ${target.avg_position ?? "n/a"}`,
        ``,
        `CANDIDATE AUTHORITY PAGES (choose the best ${Math.min(maxPerPage, usable.length)} or fewer):`,
        ...usable.map((c: any, i: number) => [
          `#${i + 1} ${c.path} — ${c.page_name} (authority ${c.authority_score}/100, outbound ${c.links_out})`,
          `Excerpt: ${bodies.get(`${c.source_table}:${c.source_id}`)}`,
        ].join("\n")),
        ``,
        `RULES`,
        `- Only recommend a link where the source page's own text genuinely supports it. Skip weak fits.`,
        `- anchor_text MUST be an exact phrase copied verbatim from that source page's excerpt (2-7 words), descriptive and keyword-relevant. Never "click here" or the bare brand name.`,
        `- Vary anchors across recommendations; no exact-match keyword stuffing.`,
        `- rationale: why this source passes relevant authority. problem: what is wrong today. seo_impact: what improves.`,
        `- priority: high | medium | low. expected_impact: one short sentence with a realistic outcome.`,
        ``,
        `Return JSON only: {"links":[{"source_index":1,"anchor_text":"...","rationale":"...","problem":"...","seo_impact":"...","priority":"high","expected_impact":"..."}]}`,
        `Return {"links":[]} if no source is a genuine topical fit.`,
      ].join("\n");

      const started = Date.now();
      const res = await callAIGateway({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1600,
      });
      aiCalls++;

      if (!res.ok) {
        const text = await res.text();
        console.error(`[silo-analyze] AI ${res.status}: ${text}`);
        if (res.status === 429 || res.status === 402) {
          return json({ error: `ai_${res.status}`, details: text, next_cursor: cursor }, res.status);
        }
        continue;
      }

      const payload = await res.json().catch(() => null);
      const content = payload?.choices?.[0]?.message?.content ?? "";
      await logAIUsage({
        feature: "reverse-siloing",
        model: MODEL,
        aiData: payload,
        latencyMs: Date.now() - started,
      }).catch(() => {});

      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = String(content).match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
      }
      const suggestions: any[] = Array.isArray(parsed?.links) ? parsed.links.slice(0, maxPerPage) : [];

      const rows: any[] = [];
      for (const s of suggestions) {
        const src = usable[Number(s.source_index) - 1];
        const anchor = String(s.anchor_text ?? "").trim();
        if (!src || anchor.length < 3) continue;
        const bodyText = bodies.get(`${src.source_table}:${src.source_id}`) ?? "";
        const verbatim = bodyText.toLowerCase().includes(anchor.toLowerCase());

        const before = Number(target.authority_score) || 0;
        const gain = clamp(
          (Number(src.authority_score) || 0) / Math.max(1, Number(src.links_out) + 1) * 0.6 +
          (target.unique_sources === 0 ? 6 : 3),
          0, 25,
        );
        const score = clamp(Math.round(
          Number(target.opportunity_score) * 0.5 +
          Number(src.authority_score) * 0.3 +
          (verbatim ? 12 : 0) +
          (s.priority === "high" ? 8 : 0),
        ));
        if (score < minScore * 0.5) continue;

        rows.push({
          run_id: runId,
          source_path: src.path,
          source_name: src.page_name,
          source_table: src.source_table,
          source_id: src.source_id,
          source_field: src.source_field,
          target_path: target.path,
          target_name: target.page_name,
          target_type: target.page_type,
          anchor_text: anchor,
          context_snippet: verbatim ? bodyText.slice(
            Math.max(0, bodyText.toLowerCase().indexOf(anchor.toLowerCase()) - 90),
            bodyText.toLowerCase().indexOf(anchor.toLowerCase()) + anchor.length + 130,
          ) : null,
          rationale: s.rationale ?? null,
          problem: s.problem ?? null,
          seo_impact: s.seo_impact ?? null,
          priority: ["high", "medium", "low"].includes(s.priority) ? s.priority : "medium",
          opportunity_score: score,
          authority_before: before,
          authority_after: Math.round(Math.min(100, before + gain)),
          expected_impact: s.expected_impact ?? null,
          status: "pending",
        });
        existing.add(`${src.path}->${target.path}`);
      }

      if (rows.length) {
        const { error } = await client.from("silo_link_recommendations")
          .upsert(rows, { onConflict: "run_id,source_path,target_path,anchor_text", ignoreDuplicates: true });
        if (error) console.error("[silo-analyze] recs insert:", error.message);
        else created += rows.length;
      }
    }

    const nextCursor = cursor + targets.length;
    const { count } = await client.from("silo_link_recommendations")
      .select("id", { count: "exact", head: true }).eq("run_id", runId);
    await client.from("silo_runs").update({ stage: "analyze", recommendations: count ?? 0 }).eq("id", runId);

    return json({
      ok: true, run_id: runId, done: false, cursor, next_cursor: nextCursor,
      analyzed: targets.length, created, ai_calls: aiCalls, recommendations: count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[silo-analyze]", message);
    await client.from("silo_runs").update({
      status: "failed", error: message, finished_at: new Date().toISOString(),
    }).eq("id", runId);
    return json({ error: message }, 500);
  }
});
