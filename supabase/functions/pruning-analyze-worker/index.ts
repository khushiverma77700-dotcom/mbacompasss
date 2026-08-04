// Content Pruning — Phase 1c: the AI decision engine.
//
// POST /pruning-analyze-worker { run_id, limit?, batch_size? }
// Admin only. Processes pages that have signals but no current recommendation,
// asks the model for one recommendation per page with a written rationale, and
// falls back to the deterministic heuristic when the model is unavailable or
// returns an unusable answer. Destructive outcomes are always re-checked
// against the safety guardrails before being stored.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import {
  RECOMMENDATIONS, heuristicDecision, violatesSafety, type Recommendation,
} from "../_shared/pruning.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM = `You are a senior technical SEO auditor performing content pruning for an Indian MBA education portal (MBA Compass).
You follow Google Search documentation, the helpful-content guidance and search quality guidelines: keep and improve pages that help users, consolidate overlapping pages, and remove only pages that help nobody.

For EACH page you receive, choose exactly ONE recommendation from:
keep, update, merge, redirect, delete, noindex, canonical, rewrite, expand, refresh.

Rules:
- merge/redirect/canonical MUST include target_url chosen from the page's duplicate or competing URLs.
- delete only for pages with no traffic, no backlinks, no unique value and no viable merge target.
- refresh when facts are outdated: list ONLY the outdated sections in "sections".
- expand for thin pages that already attract impressions; rewrite for stale low-quality pages.
- noindex for utility/low-value pages that must stay live for users.
- keep when the page is healthy.
Every item needs: problem, reason, seo_impact, solution, priority (low|medium|high|critical), expected_improvement, difficulty (easy|moderate|hard), confidence (0-1), ai_summary (2 sentences).
Be specific and quote the numbers you were given. Never invent facts.
Reply ONLY with JSON: {"items":[{"url":"...","recommendation":"...","target_url":null,"problem":"...","reason":"...","seo_impact":"...","solution":"...","sections":[],"priority":"...","expected_improvement":"...","difficulty":"...","confidence":0.8,"ai_summary":"..."}]}`;

const compact = (p: any) => ({
  url: p.url,
  type: p.page_type,
  name: p.page_name,
  words: p.word_count,
  headings: p.heading_count,
  faqs: p.faq_count,
  schema: p.has_schema,
  meta_title: p.meta_title?.slice(0, 90) ?? null,
  meta_description: p.meta_description?.slice(0, 160) ?? null,
  h1: p.h1?.slice(0, 90) ?? null,
  primary_keyword: p.primary_keyword,
  days_since_update: p.days_since_update,
  outdated_sections: p.stale_facts ?? [],
  clicks_28d: p.clicks,
  impressions_28d: p.impressions,
  ctr_pct: p.ctr,
  avg_position: p.avg_position,
  clicks_prev_28d: p.clicks_prev,
  index_state: p.index_state,
  internal_links_in: p.internal_links_in,
  internal_links_out: p.internal_links_out,
  orphan: p.is_orphan,
  backlinks: p.backlinks,
  duplicate_of: p._duplicate_of ?? null,
  competing_urls: p._cannibal ?? [],
  scores: {
    seo: p.seo_score, content: p.content_score,
    freshness: p.freshness_score, authority: p.authority_score,
    opportunity: p.opportunity_score,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({} as any));
  const runId: string | null = body?.run_id ?? null;
  const limit: number = Math.min(400, Number(body?.limit) || 120);
  const batchSize: number = Math.min(12, Number(body?.batch_size) || 8);

  try {
    const { data: pages, error } = await client
      .from("pruning_pages")
      .select("*")
      .is("analyzed_at", null)
      .order("opportunity_score", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(`pages_load_failed: ${error.message}`);
    if (!pages?.length) {
      if (runId) {
        const { count } = await client.from("pruning_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", runId);
        await client.from("pruning_runs").update({
          status: "awaiting_approval", phase: "review",
          analyzed_count: count ?? 0, finished_at: new Date().toISOString(),
        }).eq("id", runId);
      }
      return json({ ok: true, done: true, analyzed: 0 });
    }

    // Duplicate cluster + cannibalization context
    const clusterIds = Array.from(new Set(pages.map((p: any) => p.duplicate_cluster_id).filter(Boolean)));
    const clusterById = new Map<string, any>();
    if (clusterIds.length) {
      const { data: clusters } = await client.from("pruning_duplicate_clusters")
        .select("id, survivor_url, member_urls, cluster_type, similarity").in("id", clusterIds);
      for (const c of clusters ?? []) clusterById.set(c.id, c);
    }
    for (const p of pages as any[]) {
      const cluster = p.duplicate_cluster_id ? clusterById.get(p.duplicate_cluster_id) : null;
      p._duplicate_of = cluster && cluster.survivor_url !== p.url ? cluster.survivor_url : null;
      p._cannibal = Array.isArray(p.signals?.cannibal_urls) ? p.signals.cannibal_urls : [];
    }

    let analyzed = 0, failed = 0, aiUsed = 0, heuristicUsed = 0;
    const recs: any[] = [];

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize) as any[];
      let aiItems: any[] = [];
      try {
        const res = await callAIGateway({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify({ pages: batch.map(compact) }) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }, { feature: "content-pruning" });
        if (!res.ok) throw new Error(`ai_${res.status}: ${(await res.text()).slice(0, 300)}`);
        const payload = await res.json();
        const raw = payload?.choices?.[0]?.message?.content ?? "{}";
        const cleaned = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        aiItems = JSON.parse(cleaned)?.items ?? [];
      } catch (e) {
        console.warn("[pruning-analyze] AI batch failed, using heuristics:", (e as Error).message);
      }

      const aiByUrl = new Map<string, any>();
      for (const item of aiItems) if (item?.url) aiByUrl.set(String(item.url).replace(/\/$/, ""), item);

      for (const p of batch) {
        const fallback = heuristicDecision({
          url: p.url,
          page_type: p.page_type,
          word_count: p.word_count ?? 0,
          heading_count: p.heading_count ?? 0,
          faq_count: p.faq_count ?? 0,
          has_schema: !!p.has_schema,
          meta_title: p.meta_title,
          meta_description: p.meta_description,
          h1: p.h1,
          days_since_update: p.days_since_update,
          stale_facts: p.stale_facts ?? [],
          internal_links_in: p.internal_links_in ?? 0,
          internal_links_out: p.internal_links_out ?? 0,
          backlinks: p.backlinks ?? 0,
          clicks: p.clicks ?? 0,
          impressions: p.impressions ?? 0,
          avg_position: p.avg_position,
          index_state: p.index_state,
          psi_score: p.psi_score,
          duplicate_of: p._duplicate_of,
          cannibal_urls: p._cannibal,
          is_orphan: p.is_orphan,
          seo_score: p.seo_score ?? 0,
          content_score: p.content_score ?? 0,
          freshness_score: p.freshness_score ?? 0,
          opportunity_score: p.opportunity_score ?? 0,
        });

        const ai = aiByUrl.get(p.url.replace(/\/$/, ""));
        let recommendation: Recommendation = fallback.recommendation;
        let source = "heuristic";
        if (ai && RECOMMENDATIONS.includes(ai.recommendation)) {
          recommendation = ai.recommendation;
          source = "ai";
        }

        // Guardrails: destructive actions need a target and clean traffic profile.
        let target = (ai?.target_url || fallback.target_url || null) as string | null;
        const stats = { clicks: p.clicks ?? 0, impressions: p.impressions ?? 0, backlinks: p.backlinks ?? 0 };
        let guardrail: string | null = null;
        if (violatesSafety(recommendation, stats)) {
          guardrail = "Destructive action blocked: page still earns traffic or backlinks.";
          recommendation = "update";
          target = null;
        }
        if ((recommendation === "merge" || recommendation === "redirect" || recommendation === "canonical") && !target) {
          guardrail = "No consolidation target available — downgraded to update.";
          recommendation = "update";
        }

        if (source === "ai") aiUsed++; else heuristicUsed++;

        recs.push({
          run_id: runId,
          page_id: p.id,
          url: p.url,
          page_type: p.page_type,
          recommendation,
          target_url: target,
          problem: ai?.problem ?? fallback.problem,
          reason: ai?.reason ?? fallback.reason,
          seo_impact: ai?.seo_impact ?? null,
          solution: ai?.solution ?? null,
          sections: Array.isArray(ai?.sections) && ai.sections.length ? ai.sections : (p.stale_facts ?? []),
          priority: ["low", "medium", "high", "critical"].includes(ai?.priority) ? ai.priority : fallback.priority,
          expected_improvement: ai?.expected_improvement ?? null,
          difficulty: ["easy", "moderate", "hard"].includes(ai?.difficulty) ? ai.difficulty : null,
          confidence: typeof ai?.confidence === "number" ? Math.max(0, Math.min(1, ai.confidence)) : 0.5,
          competing_urls: [...(p._cannibal ?? []), ...(p._duplicate_of ? [p._duplicate_of] : [])].slice(0, 6),
          ai_summary: [ai?.ai_summary, guardrail].filter(Boolean).join(" ") || null,
          status: "pending",
        });
        analyzed++;
      }
    }

    // Replace any previous pending recommendation for these pages, then insert.
    const pageIds = pages.map((p: any) => p.id);
    for (let i = 0; i < pageIds.length; i += 300) {
      await client.from("pruning_recommendations")
        .delete().in("page_id", pageIds.slice(i, i + 300)).eq("status", "pending");
    }
    for (let i = 0; i < recs.length; i += 200) {
      const { error: insErr } = await client.from("pruning_recommendations").insert(recs.slice(i, i + 200));
      if (insErr) { failed += 1; console.error("[pruning-analyze] insert:", insErr.message); }
    }
    const nowIso = new Date().toISOString();
    for (let i = 0; i < pageIds.length; i += 300) {
      await client.from("pruning_pages").update({ analyzed_at: nowIso }).in("id", pageIds.slice(i, i + 300));
    }

    // Progress + remaining
    const { count: remaining } = await client.from("pruning_pages")
      .select("id", { count: "exact", head: true }).is("analyzed_at", null);
    if (runId) {
      const { count: total } = await client.from("pruning_recommendations")
        .select("id", { count: "exact", head: true }).eq("run_id", runId);
      await client.from("pruning_runs").update({
        analyzed_count: total ?? analyzed,
        failed_count: failed,
        status: (remaining ?? 0) > 0 ? "running" : "awaiting_approval",
        phase: (remaining ?? 0) > 0 ? "analysis" : "review",
        ...((remaining ?? 0) === 0 ? { finished_at: nowIso } : {}),
      }).eq("id", runId);
    }

    return json({
      ok: true, analyzed, remaining: remaining ?? 0, failed,
      ai_decisions: aiUsed, heuristic_decisions: heuristicUsed,
      done: (remaining ?? 0) === 0,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[pruning-analyze] failed:", msg);
    if (runId) {
      await client.from("pruning_runs").update({ status: "failed", error: msg }).eq("id", runId);
    }
    return json({ error: "analyze_failed", details: msg }, 500);
  }
});
