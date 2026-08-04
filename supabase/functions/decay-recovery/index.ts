// decay-recovery — Content Decay Recovery engine.
//
// Stages:
//   detect   → compare current vs previous 28-day GSC windows, classify decay
//   analyze  → AI refresh-ONLY briefs (never delete, never redirect)
//   approve  → admin approves a recommendation and queues a content refresh
//
// The engine is strictly non-destructive: its only output is a refresh brief
// plus a queued content_refreshes row for the existing review workflow.

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { cors, json, loadSettings, loadPages, parseAIJson } from "../_shared/seoSignals.ts";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const pct = (now: number, prev: number) => (prev > 0 ? ((now - prev) / prev) * 100 : now > 0 ? 100 : 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const isCron = body?.cron_secret && body.cron_secret === Deno.env.get("CRON_SECRET");
  if (!isCron) {
    const denied = await requireAdmin(req, cors);
    if (denied) return denied;
  }

  const sb = admin();
  const stage: string = body.stage ?? "detect";
  let runId: string | null = body.run_id ?? null;

  try {
    const settings = await loadSettings(sb);

    /* -------------------------------- DETECT ------------------------------ */
    if (stage === "detect") {
      const { data: run } = await sb.from("decay_runs")
        .insert({ status: "running", stage: "detect" }).select("id").single();
      runId = run?.id ?? null;

      const { data: metrics } = await sb.from("gsc_page_metrics")
        .select("path, window_label, clicks, impressions, ctr, avg_position");

      if (!metrics?.length) {
        await sb.from("decay_runs").update({
          status: "completed", stage: "detect_done", finished_at: new Date().toISOString(),
          notes: ["No Search Console data yet — run Signal Ingestion first."],
        }).eq("id", runId);
        return json({ run_id: runId, stage: "detect", declining: 0, note: "No performance data. Run Signal Ingestion." });
      }

      const byPath = new Map<string, { cur?: any; prev?: any }>();
      for (const m of metrics) {
        const e = byPath.get(m.path) ?? {};
        if (m.window_label === "current") e.cur = m;
        if (m.window_label === "previous") e.prev = m;
        byPath.set(m.path, e);
      }

      const pages = await loadPages(sb);
      const pageByPath = new Map(pages.map((p) => [p.path, p]));
      const rows: any[] = [];
      let declining = 0;

      for (const [path, e] of byPath) {
        const page = pageByPath.get(path);
        const cur = e.cur ?? { clicks: 0, impressions: 0, ctr: 0, avg_position: null };
        const prev = e.prev ?? { clicks: 0, impressions: 0, ctr: 0, avg_position: null };
        if ((prev.impressions ?? 0) < settings.decay_min_impressions) continue;

        const clickChange = pct(cur.clicks ?? 0, prev.clicks ?? 0);
        const imprChange = pct(cur.impressions ?? 0, prev.impressions ?? 0);
        const posChange = (cur.avg_position ?? 0) - (prev.avg_position ?? 0); // positive = worse
        const drop = -clickChange;

        let decay_state = "stable";
        let severity = "low";
        if (drop >= 60) { decay_state = "dying"; severity = "high"; }
        else if (drop >= settings.decay_click_drop_pct) { decay_state = "decaying"; severity = drop >= 40 ? "high" : "medium"; }
        else if (clickChange > 10) decay_state = "growing";

        let decay_type: string | null = null;
        if (decay_state === "decaying" || decay_state === "dying") {
          declining++;
          if (imprChange <= -25) decay_type = "demand_or_visibility_loss";
          else if (posChange >= 3) decay_type = "ranking_slide";
          else if ((cur.ctr ?? 0) < (prev.ctr ?? 0) * 0.75) decay_type = "ctr_erosion";
          else decay_type = "serp_competition";
        }

        const recovery = decay_state === "stable" || decay_state === "growing"
          ? 0
          : Math.min(100, Math.round(Math.log10(1 + (prev.clicks ?? 0)) * 25 + Math.min(50, drop / 2)));

        rows.push({
          run_id: runId,
          path,
          page_type: page?.page_type ?? null,
          page_name: page?.name ?? null,
          source_table: page?.source_table ?? null,
          source_id: page?.source_id ?? null,
          source_field: page?.source_field ?? null,
          clicks_current: cur.clicks ?? 0,
          clicks_previous: prev.clicks ?? 0,
          impressions_current: cur.impressions ?? 0,
          impressions_previous: prev.impressions ?? 0,
          ctr_current: cur.ctr ?? 0,
          ctr_previous: prev.ctr ?? 0,
          position_current: cur.avg_position ?? null,
          position_previous: prev.avg_position ?? null,
          click_change_pct: Number(clickChange.toFixed(2)),
          impression_change_pct: Number(imprChange.toFixed(2)),
          position_change: Number(posChange.toFixed(2)),
          decay_type,
          decay_state,
          severity,
          recovery_potential: recovery,
          monitoring: true,
          first_detected_at: decay_state === "stable" || decay_state === "growing" ? null : new Date().toISOString(),
        });
      }

      rows.sort((a, b) => b.recovery_potential - a.recovery_potential);
      const capped = rows.slice(0, 600);
      for (let i = 0; i < capped.length; i += 200) {
        await sb.from("decay_pages").insert(capped.slice(i, i + 200));
      }

      await sb.from("decay_runs").update({
        stage: "detect_done",
        pages_checked: capped.length,
        declining,
        notes: [`Checked ${capped.length} pages with sufficient impressions; ${declining} declining.`],
      }).eq("id", runId);

      return json({ run_id: runId, stage: "detect", next_stage: "analyze", pages_checked: capped.length, declining });
    }

    /* ------------------------------- ANALYZE ------------------------------ */
    if (stage === "analyze") {
      if (!runId) return json({ error: "run_id is required for the analyze stage." }, 400);
      const batch = Math.min(Number(body.batch ?? 6), 10);

      const { data: candidates } = await sb.from("decay_pages")
        .select("*")
        .eq("run_id", runId)
        .in("decay_state", ["decaying", "dying"])
        .order("recovery_potential", { ascending: false })
        .limit(200);

      const { data: existing } = await sb.from("decay_recommendations")
        .select("decay_page_id").eq("run_id", runId);
      const done = new Set((existing ?? []).map((r: any) => r.decay_page_id));
      const todo = (candidates ?? []).filter((c) => !done.has(c.id)).slice(0, batch);

      if (!todo.length) {
        const { count } = await sb.from("decay_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", runId);
        await sb.from("decay_runs").update({
          status: "completed", stage: "analyze_done",
          recommendations: count ?? 0, finished_at: new Date().toISOString(),
        }).eq("id", runId);
        return json({ run_id: runId, stage: "analyze", done: true, recommendations: count ?? 0 });
      }

      const pages = await loadPages(sb);
      const pageByPath = new Map(pages.map((p) => [p.path, p]));
      let created = 0;

      for (const d of todo) {
        const page = pageByPath.get(d.path);
        const excerpt = (page?.text ?? "").slice(0, 6000);

        const { data: queries } = await sb.from("gsc_query_metrics")
          .select("query, clicks, impressions, avg_position")
          .eq("path", d.path).eq("window_label", "current")
          .order("impressions", { ascending: false }).limit(25);

        const prompt = `You are a senior SEO content strategist for MBACompass.in (Indian MBA admissions, B-schools, entrance exams, coaching).

A page is losing search traffic. Produce a REFRESH-ONLY recovery plan. You may never recommend deleting, redirecting or merging the page.

PAGE
Path: ${d.path}
Name: ${d.page_name ?? "unknown"} (${d.page_type ?? "page"})
Word count: ${page?.words ?? 0}
Primary keyword: ${page?.keyword ?? "not set"}

PERFORMANCE (last 28 days vs previous 28 days)
Clicks: ${d.clicks_current} vs ${d.clicks_previous} (${d.click_change_pct}%)
Impressions: ${d.impressions_current} vs ${d.impressions_previous} (${d.impression_change_pct}%)
CTR: ${(Number(d.ctr_current) * 100).toFixed(2)}% vs ${(Number(d.ctr_previous) * 100).toFixed(2)}%
Avg position: ${d.position_current ?? "-"} vs ${d.position_previous ?? "-"}
Decay type: ${d.decay_type ?? "unknown"} (${d.severity} severity)

TOP QUERIES
${(queries ?? []).map((q: any) => `- ${q.query}: ${q.clicks} clicks / ${q.impressions} impressions / pos ${q.avg_position?.toFixed?.(1) ?? "-"}`).join("\n") || "(none)"}

CURRENT CONTENT EXCERPT
${excerpt || "(empty)"}

Return ONLY JSON:
{
  "problem": "root cause in one sentence",
  "rationale": "why a refresh recovers it",
  "seo_impact": "expected SEO effect",
  "expected_impact": "e.g. recover 40-60% of lost clicks in 4-8 weeks",
  "priority": "high|medium|low",
  "confidence": 0.0-1.0,
  "outdated_facts": ["specific stale item found in the content, e.g. references 2024 cycle"],
  "keyword_gaps": ["query with impressions but not covered in the copy"],
  "sections": [
    { "heading": "H2 to add or rewrite", "action": "add|rewrite|expand|update_data", "guidance": "what to write", "target_words": 200 }
  ],
  "refresh_brief": "3-6 sentence editorial brief for the writer, mentioning year updates, entity coverage and AEO-friendly answer formatting"
}
Only claim a fact is outdated if it is visible in the excerpt. Never invent exam dates or fees.`;

        const resp = await callAIGateway(
          {
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a precise SEO content strategist. Output valid JSON only. Never fabricate dates, fees or statistics." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          },
          { feature: "decay-recovery", purpose: "long" },
        );

        if (!resp.ok) {
          console.error("[decay-recovery] AI error", resp.status, await resp.text());
          continue;
        }
        const payload = await resp.json().catch(() => null);
        const parsed = parseAIJson<any>(payload?.choices?.[0]?.message?.content ?? "");
        if (!parsed) continue;

        const priorityWeight = parsed.priority === "high" ? 3 : parsed.priority === "medium" ? 2 : 1;
        await sb.from("decay_recommendations").insert({
          run_id: runId,
          decay_page_id: d.id,
          path: d.path,
          page_name: d.page_name,
          source_table: d.source_table,
          source_id: d.source_id,
          source_field: d.source_field,
          action: "refresh",
          sections: parsed.sections ?? [],
          refresh_brief: parsed.refresh_brief ?? null,
          outdated_facts: parsed.outdated_facts ?? [],
          keyword_gaps: parsed.keyword_gaps ?? [],
          problem: parsed.problem ?? null,
          rationale: parsed.rationale ?? null,
          seo_impact: parsed.seo_impact ?? null,
          expected_impact: parsed.expected_impact ?? null,
          priority: parsed.priority ?? "medium",
          confidence: parsed.confidence ?? null,
          score: priorityWeight * 100 + Number(d.recovery_potential ?? 0),
          status: "pending",
        });
        created++;
      }

      return json({ run_id: runId, stage: "analyze", next_stage: "analyze", processed: todo.length, created });
    }

    /* ------------------------------- APPROVE ------------------------------ */
    if (stage === "approve") {
      const ids: string[] = Array.isArray(body.recommendation_ids) ? body.recommendation_ids : [];
      if (!ids.length) return json({ error: "recommendation_ids is required." }, 400);

      const { data: recs } = await sb.from("decay_recommendations").select("*").in("id", ids);
      const results: any[] = [];

      for (const rec of recs ?? []) {
        try {
          const { data: refresh, error } = await sb.from("content_refreshes").insert({
            entity_type: rec.source_table ?? "page",
            entity_id: rec.source_id ?? null,
            entity_slug: rec.path,
            entity_name: rec.page_name,
            refresh_mode: "decay_recovery",
            status: "queued",
            ai_notes: [rec.problem, rec.refresh_brief].filter(Boolean).join("\n\n"),
            current_snapshot: { path: rec.path, sections: rec.sections },
            proposed_snapshot: {
              sections: rec.sections,
              keyword_gaps: rec.keyword_gaps,
              outdated_facts: rec.outdated_facts,
              brief: rec.refresh_brief,
            },
          }).select("id").single();
          if (error) throw new Error(error.message);

          await sb.from("decay_recommendations").update({
            status: "approved",
            approved_at: new Date().toISOString(),
            refresh_id: refresh?.id ?? null,
            error: null,
          }).eq("id", rec.id);
          results.push({ id: rec.id, ok: true, refresh_id: refresh?.id });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await sb.from("decay_recommendations").update({ status: "failed", error: msg }).eq("id", rec.id);
          results.push({ id: rec.id, ok: false, error: msg });
        }
      }

      if (recs?.[0]?.run_id) {
        const { count } = await sb.from("decay_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", recs[0].run_id).eq("status", "approved");
        await sb.from("decay_runs").update({ approved: count ?? 0, queued_refreshes: count ?? 0 }).eq("id", recs[0].run_id);
      }
      return json({ approved: results.filter((r) => r.ok).length, results });
    }

    if (stage === "reject") {
      const ids: string[] = Array.isArray(body.recommendation_ids) ? body.recommendation_ids : [];
      if (!ids.length) return json({ error: "recommendation_ids is required." }, 400);
      await sb.from("decay_recommendations").update({ status: "rejected" }).in("id", ids);
      return json({ rejected: ids.length });
    }

    return json({ error: `Unknown stage: ${stage}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[decay-recovery]", msg);
    if (runId) {
      await sb.from("decay_runs").update({
        status: "failed", error: msg, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: msg }, 500);
  }
});
