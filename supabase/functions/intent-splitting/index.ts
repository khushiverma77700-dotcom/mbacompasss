// intent-splitting — Search Intent Splitting engine.
//
// Stages:
//   cluster  → group real GSC queries into intent clusters, detect cannibalization
//   analyze  → AI briefs + redirect / canonical / internal-link recommendations
//   apply    → execute an approved recommendation (redirect, canonical, link)
//
// Destructive actions (redirect / canonical) always require admin approval;
// only internal-link and brief actions may auto-apply when enabled.

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import {
  cors, json, loadSettings, loadPages, classifyIntent, clusterKeyFor, jaccard, tokenize,
  parseAIJson,
} from "../_shared/seoSignals.ts";
import { insertContextualLink } from "../_shared/silo.ts";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

interface ClusterAgg {
  cluster_key: string;
  primary_keyword: string;
  intent_type: string;
  keywords: Map<string, { clicks: number; impressions: number; position: number | null }>;
  paths: Map<string, { clicks: number; impressions: number; position: number | null }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const denied = await requireAdmin(req, cors);
  if (denied) return denied;

  const sb = admin();
  const body = await req.json().catch(() => ({} as any));
  const stage: string = body.stage ?? "cluster";
  let runId: string | null = body.run_id ?? null;

  try {
    const settings = await loadSettings(sb);

    /* ------------------------------- CLUSTER ------------------------------ */
    if (stage === "cluster") {
      const { data: run } = await sb.from("intent_runs")
        .insert({ status: "running", stage: "cluster" }).select("id").single();
      runId = run?.id ?? null;

      const { data: queries } = await sb.from("gsc_query_metrics")
        .select("path, query, clicks, impressions, avg_position")
        .eq("window_label", "current")
        .gte("impressions", 5)
        .order("impressions", { ascending: false })
        .limit(4000);

      if (!queries?.length) {
        await sb.from("intent_runs").update({
          status: "completed", stage: "cluster_done", finished_at: new Date().toISOString(),
          notes: ["No Search Console query data yet — run Signal Ingestion first."],
        }).eq("id", runId);
        return json({ run_id: runId, stage: "cluster", clusters: 0, note: "No query data. Run Signal Ingestion." });
      }

      const clusters = new Map<string, ClusterAgg>();
      for (const q of queries) {
        const key = clusterKeyFor(q.query);
        if (!key) continue;
        let c = clusters.get(key);
        if (!c) {
          c = {
            cluster_key: key,
            primary_keyword: q.query,
            intent_type: classifyIntent(q.query),
            keywords: new Map(),
            paths: new Map(),
          };
          clusters.set(key, c);
        }
        const kw = c.keywords.get(q.query) ?? { clicks: 0, impressions: 0, position: null };
        kw.clicks += q.clicks; kw.impressions += q.impressions; kw.position = q.avg_position;
        c.keywords.set(q.query, kw);

        const p = c.paths.get(q.path) ?? { clicks: 0, impressions: 0, position: null };
        p.clicks += q.clicks; p.impressions += q.impressions;
        p.position = p.position == null ? q.avg_position : Math.min(p.position, q.avg_position ?? 999);
        c.paths.set(q.path, p);
      }

      const rows: any[] = [];
      for (const c of clusters.values()) {
        const paths = Array.from(c.paths.entries())
          .map(([path, m]) => ({ path, ...m }))
          .sort((a, b) => b.impressions - a.impressions);
        // Only pages that genuinely compete (>=10% of cluster impressions) count.
        const total = paths.reduce((s, p) => s + p.impressions, 0) || 1;
        const competing = paths.filter((p) => p.impressions / total >= 0.1);
        const cannibalized = competing.length > 1;
        const best = paths[0];
        const severity = !cannibalized ? "low"
          : competing.length >= 4 || total >= 1000 ? "high"
          : competing.length === 3 || total >= 300 ? "medium" : "low";

        const subIntents = Array.from(new Set(Array.from(c.keywords.keys()).map(classifyIntent)));

        rows.push({
          run_id: runId,
          cluster_key: c.cluster_key,
          primary_keyword: c.primary_keyword,
          intent_type: c.intent_type,
          sub_intents: subIntents,
          keywords: Array.from(c.keywords.entries()).map(([k, m]) => ({ keyword: k, ...m })).slice(0, 40),
          total_impressions: total,
          total_clicks: paths.reduce((s, p) => s + p.clicks, 0),
          best_position: best?.position ?? null,
          competing_paths: competing.slice(0, 10),
          page_count: competing.length,
          is_cannibalized: cannibalized,
          severity,
          winner_path: best?.path ?? null,
          winner_reason: best ? `Highest impressions (${best.impressions}) and best position in the cluster.` : null,
          // Multiple distinct sub-intents on one page = candidate for a split.
          needs_new_page: !cannibalized && subIntents.length > 1 && total >= 200,
        });
      }

      rows.sort((a, b) => b.total_impressions - a.total_impressions);
      const top = rows.slice(0, 400);
      for (let i = 0; i < top.length; i += 200) {
        await sb.from("intent_clusters").insert(top.slice(i, i + 200));
      }

      const conflicts = top.filter((r) => r.is_cannibalized).length;
      await sb.from("intent_runs").update({
        stage: "cluster_done",
        keywords_analyzed: queries.length,
        clusters_found: top.length,
        conflicts_found: conflicts,
        notes: [`Clustered ${queries.length} queries into ${top.length} intent clusters; ${conflicts} cannibalization conflicts.`],
      }).eq("id", runId);

      return json({ run_id: runId, stage: "cluster", next_stage: "analyze", clusters: top.length, conflicts });
    }

    /* ------------------------------- ANALYZE ------------------------------ */
    if (stage === "analyze") {
      if (!runId) return json({ error: "run_id is required for the analyze stage." }, 400);

      const batch = Math.min(Number(body.batch ?? 8), 12);
      const { data: clusters } = await sb.from("intent_clusters")
        .select("*")
        .eq("run_id", runId)
        .is("ai_summary", null)
        .or("is_cannibalized.eq.true,needs_new_page.eq.true")
        .order("total_impressions", { ascending: false })
        .limit(batch);

      if (!clusters?.length) {
        const { count } = await sb.from("intent_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", runId);
        await sb.from("intent_runs").update({
          status: "completed", stage: "analyze_done",
          recommendations: count ?? 0, finished_at: new Date().toISOString(),
        }).eq("id", runId);
        return json({ run_id: runId, stage: "analyze", done: true, recommendations: count ?? 0 });
      }

      const pages = await loadPages(sb);
      const pageByPath = new Map(pages.map((p) => [p.path, p]));
      let created = 0;

      for (const cluster of clusters) {
        const competing = (cluster.competing_paths ?? []) as any[];
        const context = competing.map((c) => {
          const p = pageByPath.get(c.path);
          return `- ${c.path} | ${p?.name ?? "unknown"} | type: ${p?.page_type ?? "?"} | ${p?.words ?? 0} words | keyword: ${p?.keyword ?? "none"} | clicks ${c.clicks}, impressions ${c.impressions}, position ${c.position ?? "-"}`;
        }).join("\n");

        const prompt = `You are an enterprise technical SEO strategist for MBACompass.in (Indian MBA admissions, colleges, entrance exams, coaching).

KEYWORD CLUSTER
Primary keyword: "${cluster.primary_keyword}"
Detected intent: ${cluster.intent_type}
Sub-intents present: ${(cluster.sub_intents ?? []).join(", ")}
Cluster impressions: ${cluster.total_impressions}, clicks: ${cluster.total_clicks}
Keywords: ${(cluster.keywords ?? []).slice(0, 20).map((k: any) => k.keyword).join(" | ")}

COMPETING PAGES
${context || "(none)"}

TASK
Decide how to resolve this cluster so exactly ONE page owns each distinct search intent.
Rules:
- Never recommend deleting content.
- Prefer canonical/internal-link consolidation over redirects; recommend a 301 redirect only when a page has near-zero unique value.
- "split" means the cluster mixes different intents and a NEW dedicated page is needed — return a full content brief.
- Keep the winner as the page with the strongest performance and topical fit.

Return ONLY JSON:
{
  "summary": "2 sentence diagnosis",
  "winner_path": "/path",
  "winner_reason": "why",
  "recommendations": [
    {
      "action": "canonical" | "redirect" | "internal_link" | "brief" | "split",
      "source_path": "/path being changed",
      "target_path": "/winner or new page path",
      "anchor_text": "only for internal_link — exact phrase already likely in source copy",
      "keyword": "keyword this page should own",
      "intent_type": "informational|commercial|transactional|navigational|comparison",
      "title": "for brief/split only",
      "brief": { "h1": "", "outline": ["H2 ..."], "must_cover": [""], "faqs": [{"q":"","a":""}], "word_target": 1200 },
      "problem": "what is wrong today",
      "rationale": "why this fixes it",
      "seo_impact": "expected SEO effect",
      "priority": "high|medium|low",
      "confidence": 0.0-1.0
    }
  ]
}`;

        const resp = await callAIGateway(
          {
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a precise technical SEO strategist. Output valid JSON only." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          },
          { feature: "intent-splitting", purpose: "long" },
        );

        if (!resp.ok) {
          console.error("[intent-splitting] AI error", resp.status, await resp.text());
          continue;
        }
        const payload = await resp.json().catch(() => null);
        const parsed = parseAIJson<any>(payload?.choices?.[0]?.message?.content ?? "");
        if (!parsed) continue;

        await sb.from("intent_clusters").update({
          ai_summary: parsed.summary ?? "Analyzed.",
          winner_path: parsed.winner_path ?? cluster.winner_path,
          winner_reason: parsed.winner_reason ?? cluster.winner_reason,
        }).eq("id", cluster.id);

        const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 6) : [];
        for (const r of recs) {
          const src = pageByPath.get(r.source_path);
          const safe = r.action === "internal_link" || r.action === "brief" || r.action === "split";
          const autoApply = safe && settings.auto_apply_safe_actions && r.action === "internal_link";
          const priorityWeight = r.priority === "high" ? 3 : r.priority === "medium" ? 2 : 1;

          await sb.from("intent_recommendations").insert({
            run_id: runId,
            cluster_id: cluster.id,
            action: r.action ?? "brief",
            source_path: r.source_path ?? null,
            source_table: src?.source_table ?? null,
            source_id: src?.source_id ?? null,
            source_field: src?.source_field ?? null,
            target_path: r.target_path ?? null,
            anchor_text: r.anchor_text ?? null,
            keyword: r.keyword ?? cluster.primary_keyword,
            intent_type: r.intent_type ?? cluster.intent_type,
            title: r.title ?? null,
            brief: r.brief ?? null,
            problem: r.problem ?? null,
            rationale: r.rationale ?? null,
            seo_impact: r.seo_impact ?? null,
            priority: r.priority ?? "medium",
            confidence: r.confidence ?? null,
            score: priorityWeight * 100 + Math.min(900, cluster.total_impressions),
            status: autoApply ? "approved" : "pending",
          });
          created++;
        }
      }

      return json({ run_id: runId, stage: "analyze", next_stage: "analyze", processed: clusters.length, created });
    }

    /* -------------------------------- APPLY ------------------------------- */
    if (stage === "apply") {
      const ids: string[] = Array.isArray(body.recommendation_ids) ? body.recommendation_ids : [];
      if (!ids.length) return json({ error: "recommendation_ids is required." }, 400);

      const { data: recs } = await sb.from("intent_recommendations").select("*").in("id", ids);
      const results: any[] = [];

      for (const rec of recs ?? []) {
        try {
          if (rec.action === "redirect") {
            if (!rec.source_path || !rec.target_path) throw new Error("Missing source or target path.");
            await sb.from("seo_redirects").upsert({
              from_path: rec.source_path,
              to_path: rec.target_path,
              status_code: 301,
              reason: `Intent consolidation: ${rec.problem ?? "cannibalization"}`,
              source: "intent-splitting",
              is_active: true,
            }, { onConflict: "from_path" });
            await sb.from("intent_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: "redirect",
              from_path: rec.source_path, to_path: rec.target_path,
              revert_payload: { type: "redirect", from_path: rec.source_path },
            });
          } else if (rec.action === "canonical") {
            if (!rec.source_path || !rec.target_path) throw new Error("Missing source or target path.");
            const { data: existing } = await sb.from("page_seo_overrides")
              .select("slug, json_ld").eq("slug", rec.source_path).maybeSingle();
            const jsonLd = { ...(existing?.json_ld ?? {}), canonicalOverride: rec.target_path };
            await sb.from("page_seo_overrides").upsert(
              { slug: rec.source_path, json_ld: jsonLd, search_intent: rec.intent_type ?? null },
              { onConflict: "slug" },
            );
            await sb.from("intent_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: "canonical",
              from_path: rec.source_path, to_path: rec.target_path,
              revert_payload: { type: "canonical", slug: rec.source_path, json_ld: existing?.json_ld ?? null },
            });
          } else if (rec.action === "internal_link") {
            if (!rec.source_table || !rec.source_id || !rec.source_field || !rec.target_path) {
              throw new Error("Missing link insertion target.");
            }
            const { data: row } = await sb.from(rec.source_table)
              .select(`id, ${rec.source_field}`).eq("id", rec.source_id).maybeSingle();
            const before = String((row as any)?.[rec.source_field] ?? "");
            const inserted = insertContextualLink(
              before, rec.anchor_text ?? rec.keyword ?? "", rec.target_path,
            );
            await sb.from(rec.source_table).update({ [rec.source_field]: inserted.html }).eq("id", rec.source_id);
            await sb.from("intent_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: "internal_link",
              source_table: rec.source_table, source_id: rec.source_id, source_field: rec.source_field,
              from_path: rec.source_path, to_path: rec.target_path,
              notes: inserted.snippet,
              revert_payload: { type: "field", table: rec.source_table, id: rec.source_id, field: rec.source_field, before },
            });
          } else {
            // brief / split: nothing to write to the live site — mark as actioned so
            // the editorial team can pick the brief up from the dashboard.
            await sb.from("intent_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: rec.action,
              from_path: rec.source_path, to_path: rec.target_path,
              notes: "Content brief handed to editorial queue.",
            });
          }

          await sb.from("intent_recommendations").update({
            status: "applied", applied_at: new Date().toISOString(), error: null,
          }).eq("id", rec.id);
          results.push({ id: rec.id, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await sb.from("intent_recommendations").update({ status: "failed", error: msg }).eq("id", rec.id);
          results.push({ id: rec.id, ok: false, error: msg });
        }
      }

      const applied = results.filter((r) => r.ok).length;
      if (recs?.[0]?.run_id) {
        const { count } = await sb.from("intent_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", recs[0].run_id).eq("status", "applied");
        await sb.from("intent_runs").update({ applied: count ?? applied }).eq("id", recs[0].run_id);
      }
      return json({ applied, results });
    }

    /* -------------------------------- REVERT ------------------------------ */
    if (stage === "revert") {
      const actionId = body.action_id;
      if (!actionId) return json({ error: "action_id is required." }, 400);
      const { data: action } = await sb.from("intent_actions").select("*").eq("id", actionId).maybeSingle();
      if (!action) return json({ error: "Action not found." }, 404);
      const rp = action.revert_payload ?? {};

      if (rp.type === "redirect") {
        await sb.from("seo_redirects").update({ is_active: false }).eq("from_path", rp.from_path);
      } else if (rp.type === "canonical") {
        await sb.from("page_seo_overrides").update({ json_ld: rp.json_ld }).eq("slug", rp.slug);
      } else if (rp.type === "field") {
        await sb.from(rp.table).update({ [rp.field]: rp.before }).eq("id", rp.id);
      }

      await sb.from("intent_actions").update({ status: "reverted", reverted_at: new Date().toISOString() }).eq("id", actionId);
      if (action.recommendation_id) {
        await sb.from("intent_recommendations").update({ status: "reverted" }).eq("id", action.recommendation_id);
      }
      return json({ reverted: true });
    }

    return json({ error: `Unknown stage: ${stage}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[intent-splitting]", msg);
    if (runId) {
      await sb.from("intent_runs").update({
        status: "failed", error: msg, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: msg }, 500);
  }
});
