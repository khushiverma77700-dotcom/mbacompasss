// Reverse Siloing — stage 3: execute approved contextual links.
//
// POST /silo-apply
//   { run_id?: string, recommendation_ids?: string[], apply_all_approved?: boolean,
//     auto?: boolean, limit?: number }
//   { revert_action_id: string }   → undo a previously applied link
//
// Admin only. Every write stores the exact previous HTML so it can be reverted.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { insertContextualLink } from "../_shared/silo.ts";

const sb = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authFail = await requireAdmin(req, corsHeaders);
  if (authFail) return authFail;

  const client = sb();
  const body = await req.json().catch(() => ({} as any));

  try {
    /* --------------------------------- revert -------------------------------- */
    if (body?.revert_action_id) {
      const { data: action, error } = await client.from("silo_actions")
        .select("*").eq("id", body.revert_action_id).maybeSingle();
      if (error || !action) return json({ error: "action_not_found" }, 404);
      if (action.reverted_at) return json({ error: "already_reverted" }, 400);

      const payload = action.revert_payload as any;
      if (!payload?.field || !action.source_table || !action.source_id) {
        return json({ error: "not_revertible" }, 400);
      }
      const { error: upErr } = await client.from(action.source_table)
        .update({ [payload.field]: payload.before })
        .eq("id", action.source_id);
      if (upErr) return json({ error: `revert_failed: ${upErr.message}` }, 500);

      await client.from("silo_actions").update({ reverted_at: new Date().toISOString() })
        .eq("id", action.id);
      if (action.recommendation_id) {
        await client.from("silo_link_recommendations")
          .update({ status: "approved", applied_at: null }).eq("id", action.recommendation_id);
      }
      return json({ ok: true, reverted: true });
    }

    /* --------------------------------- apply --------------------------------- */
    const { data: settings } = await client.from("silo_settings").select("*").eq("id", true).maybeSingle();
    const limit = Math.min(
      Number(body?.limit ?? settings?.max_links_per_run ?? 50),
      Number(settings?.max_links_per_run ?? 50),
    );
    const isAuto = Boolean(body?.auto);

    if (isAuto && !settings?.auto_apply_links) {
      return json({ ok: true, applied: 0, skipped: "auto_apply_disabled" });
    }

    let q = client.from("silo_link_recommendations").select("*")
      .order("opportunity_score", { ascending: false }).limit(limit);

    if (Array.isArray(body?.recommendation_ids) && body.recommendation_ids.length) {
      q = q.in("id", body.recommendation_ids);
    } else if (body?.apply_all_approved || isAuto) {
      q = q.eq("status", isAuto ? "pending" : "approved");
      if (body?.run_id) q = q.eq("run_id", body.run_id);
      if (isAuto) q = q.gte("opportunity_score", Number(settings?.min_opportunity_score ?? 60));
    } else {
      return json({ error: "nothing_selected" }, 400);
    }

    const { data: recs, error: rErr } = await q;
    if (rErr) throw new Error(`recs: ${rErr.message}`);
    if (!recs?.length) return json({ ok: true, applied: 0, failed: 0, results: [] });

    const results: any[] = [];
    let applied = 0;
    let failed = 0;

    for (const rec of recs) {
      if (rec.status === "applied") { results.push({ id: rec.id, skipped: "already_applied" }); continue; }
      if (!rec.source_table || !rec.source_id || !rec.source_field) {
        failed++;
        await client.from("silo_link_recommendations")
          .update({ status: "failed", error: "no_editable_field" }).eq("id", rec.id);
        results.push({ id: rec.id, error: "no_editable_field" });
        continue;
      }

      const { data: row, error: loadErr } = await client.from(rec.source_table)
        .select(`id, ${rec.source_field}`).eq("id", rec.source_id).maybeSingle();
      if (loadErr || !row) {
        failed++;
        await client.from("silo_link_recommendations")
          .update({ status: "failed", error: loadErr?.message ?? "source_row_missing" }).eq("id", rec.id);
        results.push({ id: rec.id, error: loadErr?.message ?? "source_row_missing" });
        continue;
      }

      const before = typeof row[rec.source_field] === "string" ? row[rec.source_field] as string : "";
      const inserted = insertContextualLink(
        before,
        rec.anchor_text,
        rec.target_path,
        rec.expected_impact ? `${rec.anchor_text} — ${rec.target_name ?? "learn more"}.` : undefined,
      );

      if (!inserted) {
        await client.from("silo_link_recommendations")
          .update({ status: "applied", applied_at: new Date().toISOString(), error: "link_already_present" })
          .eq("id", rec.id);
        results.push({ id: rec.id, skipped: "link_already_present" });
        continue;
      }

      const { error: upErr } = await client.from(rec.source_table)
        .update({ [rec.source_field]: inserted.html }).eq("id", rec.source_id);
      if (upErr) {
        failed++;
        await client.from("silo_link_recommendations")
          .update({ status: "failed", error: upErr.message }).eq("id", rec.id);
        results.push({ id: rec.id, error: upErr.message });
        continue;
      }

      await client.from("silo_actions").insert({
        run_id: rec.run_id,
        recommendation_id: rec.id,
        action: `insert_link:${inserted.mode}`,
        source_table: rec.source_table,
        source_id: rec.source_id,
        source_field: rec.source_field,
        from_path: rec.source_path,
        to_path: rec.target_path,
        anchor_text: rec.anchor_text,
        status: "success",
        revert_payload: { field: rec.source_field, before },
        notes: inserted.snippet,
      });

      await client.from("silo_link_recommendations").update({
        status: "applied",
        applied_at: new Date().toISOString(),
        auto_applied: isAuto,
        error: null,
      }).eq("id", rec.id);

      applied++;
      results.push({ id: rec.id, mode: inserted.mode, from: rec.source_path, to: rec.target_path });
    }

    const runId = body?.run_id ?? recs[0]?.run_id;
    if (runId) {
      const { count } = await client.from("silo_link_recommendations")
        .select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "applied");
      await client.from("silo_runs").update({ applied: count ?? applied }).eq("id", runId);
    }

    return json({ ok: true, applied, failed, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[silo-apply]", message);
    return json({ error: message }, 500);
  }
});
