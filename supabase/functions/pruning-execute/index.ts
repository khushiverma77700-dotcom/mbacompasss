// Content Pruning — Phase 3: execute approved recommendations.
//
// POST /pruning-execute { run_id?, recommendation_ids: string[], confirm_delete?: boolean }
// Admin only. Applies ONLY recommendations whose status is "approved".
// Every change writes a pruning_actions row with a revert payload.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { violatesSafety } from "../_shared/pruning.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const REFRESH_ACTIONS = new Set(["update", "rewrite", "expand", "refresh"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({} as any));
  const ids: string[] = Array.isArray(body?.recommendation_ids) ? body.recommendation_ids : [];
  const confirmDelete = body?.confirm_delete === true;
  const runId: string | null = body?.run_id ?? null;

  if (!ids.length) return json({ error: "recommendation_ids required" }, 400);

  try {
    const { data: recs, error } = await client
      .from("pruning_recommendations")
      .select("*, page:pruning_pages(*)")
      .in("id", ids)
      .eq("status", "approved");
    if (error) throw new Error(`load_failed: ${error.message}`);
    if (!recs?.length) return json({ error: "no_approved_recommendations" }, 400);

    const results: any[] = [];
    let executed = 0;

    for (const rec of recs as any[]) {
      const page = rec.page ?? {};
      const path = page.path ?? new URL(rec.url).pathname;
      const action = rec.recommendation as string;
      let status = "success";
      let details: Record<string, unknown> = {};
      let revert: Record<string, unknown> | null = null;
      let errText: string | null = null;

      try {
        if (violatesSafety(action, {
          clicks: page.clicks ?? 0, impressions: page.impressions ?? 0, backlinks: page.backlinks ?? 0,
        })) {
          throw new Error("blocked_by_safety_guardrail: page still earns traffic or backlinks");
        }

        if (action === "keep") {
          details = { note: "no change required" };
        } else if (REFRESH_ACTIONS.has(action)) {
          // Hand the page to the existing Re-SEO / refresh pipeline.
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/seo-reoptimize`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: req.headers.get("Authorization") ?? "",
            },
            body: JSON.stringify({ urls: [rec.url], mode: "preview", source: "content_pruning" }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`reseo_queue_failed [${res.status}]: ${text.slice(0, 240)}`);
          details = { queued: "seo-reoptimize", sections: rec.sections ?? [] };
        } else if (action === "noindex" || action === "canonical") {
          const slug = page.source_table ? path : `static:${path}`;
          const { data: before } = await client.from("page_seo_overrides")
            .select("*").eq("slug", slug).maybeSingle();
          revert = { table: "page_seo_overrides", slug, row: before ?? null };
          const patch: Record<string, unknown> = { slug, updated_at: new Date().toISOString() };
          if (action === "noindex") patch.robots_directive = "noindex,follow";
          if (action === "canonical") patch.canonical_override = rec.target_url;
          // Store directives inside json_ld-adjacent metadata when dedicated
          // columns are absent, so the head layer can read them either way.
          patch.json_ld = {
            ...(before?.json_ld ?? {}),
            _pruning: {
              ...(action === "noindex" ? { robots: "noindex,follow" } : {}),
              ...(action === "canonical" ? { canonical: rec.target_url } : {}),
              set_at: new Date().toISOString(),
            },
          };
          delete patch.robots_directive;
          delete patch.canonical_override;
          const { error: upErr } = await client.from("page_seo_overrides").upsert(patch, { onConflict: "slug" });
          if (upErr) throw new Error(`override_failed: ${upErr.message}`);
          if (action === "noindex") {
            await client.from("pruning_pages").update({ in_sitemap: false, robots: "noindex,follow" }).eq("id", page.id);
          } else {
            await client.from("pruning_pages").update({ canonical_url: rec.target_url }).eq("id", page.id);
          }
          details = { slug, directive: action, target: rec.target_url ?? null };
        } else if (action === "redirect" || action === "merge") {
          if (!rec.target_url) throw new Error("target_url_required");
          const toPath = rec.target_url.startsWith("http") ? new URL(rec.target_url).pathname : rec.target_url;
          const { error: rErr } = await client.from("seo_redirects").upsert({
            from_path: path,
            to_path: toPath,
            status_code: 301,
            reason: rec.problem ?? action,
            source: "content_pruning",
            is_active: true,
          }, { onConflict: "from_path" });
          if (rErr) throw new Error(`redirect_failed: ${rErr.message}`);
          await client.from("pruning_pages").update({ in_sitemap: false }).eq("id", page.id);
          revert = { table: "seo_redirects", from_path: path };
          details = { from: path, to: toPath, type: 301, merged: action === "merge" };
        } else if (action === "delete") {
          if (!confirmDelete) throw new Error("delete_requires_confirmation");
          if (!page.source_table || !page.source_id) throw new Error("page_has_no_deletable_source_row");
          const { data: snapshot } = await client.from(page.source_table)
            .select("*").eq("id", page.source_id).maybeSingle();
          revert = { table: page.source_table, id: page.source_id, row: snapshot ?? null };
          const { error: dErr } = await client.from(page.source_table).delete().eq("id", page.source_id);
          if (dErr) throw new Error(`delete_failed: ${dErr.message}`);
          const toPath = rec.target_url
            ? (rec.target_url.startsWith("http") ? new URL(rec.target_url).pathname : rec.target_url)
            : "/";
          await client.from("seo_redirects").upsert({
            from_path: path, to_path: toPath, status_code: 301,
            reason: `pruned: ${rec.problem ?? "low value"}`, source: "content_pruning", is_active: true,
          }, { onConflict: "from_path" });
          await client.from("pruning_pages").delete().eq("id", page.id);
          details = { deleted_from: page.source_table, redirected_to: toPath };
        } else {
          throw new Error(`unsupported_action: ${action}`);
        }

        await client.from("pruning_recommendations").update({
          status: "executed", executed_at: new Date().toISOString(), error: null,
        }).eq("id", rec.id);
        executed++;
      } catch (e) {
        status = "failed";
        errText = (e as Error).message;
        await client.from("pruning_recommendations").update({ error: errText }).eq("id", rec.id);
      }

      await client.from("pruning_actions").insert({
        run_id: runId ?? rec.run_id ?? null,
        recommendation_id: rec.id,
        url: rec.url,
        action,
        status,
        details,
        revert_payload: revert,
        error: errText,
      });
      results.push({ url: rec.url, action, status, error: errText, details });
    }

    // Refresh discovery surfaces after any structural change.
    const structural = results.some((r) =>
      r.status === "success" && ["redirect", "merge", "delete", "noindex"].includes(r.action));
    if (structural) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sitemap-refresh-cron`, {
        method: "POST",
        headers: { Authorization: req.headers.get("Authorization") ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({ source: "content_pruning" }),
      }).catch(() => {});
    }

    if (runId) {
      const { count } = await client.from("pruning_recommendations")
        .select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "executed");
      await client.from("pruning_runs").update({
        executed_count: count ?? executed,
        phase: "executed",
        status: "completed",
        impact_report: {
          executed_at: new Date().toISOString(),
          actions: results.reduce<Record<string, number>>((acc, r) => {
            if (r.status === "success") acc[r.action] = (acc[r.action] ?? 0) + 1;
            return acc;
          }, {}),
          failures: results.filter((r) => r.status === "failed").length,
        },
      }).eq("id", runId);
    }

    return json({ ok: true, executed, failed: results.length - executed, results });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[pruning-execute] failed:", msg);
    return json({ error: "execute_failed", details: msg }, 500);
  }
});
