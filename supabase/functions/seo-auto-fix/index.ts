import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NEW_DOMAIN = "https://mbacompass.in";
const OLD_DOMAINS = ["bschoolbuzz.com", "bschoolbus.com", "bestmbacoaching.com"];

const CONTENT_TABLES: { contentType: string; table: string; column: string }[] = [
  { contentType: "article", table: "articles", column: "content" },
  { contentType: "institute", table: "institutes", column: "description" },
  { contentType: "college", table: "colleges", column: "description" },
  { contentType: "exam", table: "exams", column: "description" },
  { contentType: "cityPage", table: "city_pages", column: "detailed_content" },
  { contentType: "category", table: "categories", column: "description" },
  { contentType: "course", table: "courses", column: "description" },
];

const MIN_CONTENT_WORDS = 800;
const wordCount = (s: any) => (typeof s === "string" ? s.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length : 0);

const REWRITE_TARGETS: { table: string; columns: string[] }[] = [
  { table: "articles", columns: ["title", "content", "meta_title", "meta_description", "excerpt", "intro"] },
  { table: "colleges", columns: ["name", "description", "meta_title", "meta_description", "admission_process"] },
  { table: "institutes", columns: ["name", "description", "meta_title", "meta_description"] },
  { table: "exams", columns: ["name", "description", "meta_title", "meta_description"] },
  { table: "city_pages", columns: ["name", "intro_content", "detailed_content", "faq_content", "meta_title", "meta_description"] },
  { table: "banners", columns: ["title", "subtitle", "link_url"] },
];

function rewriteLegacy(value: string): { changed: boolean; next: string } {
  if (!value) return { changed: false, next: value };
  let next = value;
  for (const d of OLD_DOMAINS) {
    next = next.replace(new RegExp(`https?://(www\\.)?${d.replace(/\./g, "\\.")}`, "gi"), NEW_DOMAIN);
    next = next.replace(new RegExp(d.replace(/\./g, "\\.")  , "gi"), "mbacompass.in");
  }
  return { changed: next !== value, next };
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = auth.replace("Bearer ", "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleRow } = await sbAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

/**
 * Unified SEO auto-fix orchestrator.
 *
 * Actions:
 *  - "rewrite_legacy_domains" -> rewrites old domain references in DB content + indexing queue
 *  - "fix_missing_meta"       -> finds rows missing meta_title/description and queues them for AI generation
 *  - "flush_indexing"         -> retries failed + force-submits pending indexing rows
 *  - "rebuild_sitemap"        -> pings serve-sitemap to regenerate
 *  - "fix_all"                -> runs all of the above sequentially (safe order)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const fail = await requireAdmin(req);
  if (fail) return fail;

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "fix_all";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const summary: Record<string, any> = { action, steps: [] };

    // ── 1. Rewrite legacy domain references in DB ───────────────────
    if (action === "rewrite_legacy_domains" || action === "fix_all") {
      let dbRewrites = 0;
      for (const t of REWRITE_TARGETS) {
        const orFilter = t.columns
          .flatMap((c) => OLD_DOMAINS.map((d) => `${c}.ilike.%${d}%`))
          .join(",");
        const { data, error } = await (sb as any)
          .from(t.table).select(["id", ...t.columns].join(",")).or(orFilter).limit(500);
        if (error || !data) continue;
        for (const row of data) {
          const update: Record<string, any> = {};
          for (const col of t.columns) {
            const v: string = row?.[col];
            if (typeof v !== "string") continue;
            const { changed, next } = rewriteLegacy(v);
            if (changed) update[col] = next;
          }
          if (Object.keys(update).length) {
            const { error: upErr } = await (sb as any).from(t.table).update(update).eq("id", row.id);
            if (!upErr) dbRewrites++;
          }
        }
      }
      // Indexing queue rows pointing at legacy domains -> rewrite URL
      const { data: idxRows } = await sb
        .from("indexing_urls")
        .select("id, url")
        .or(OLD_DOMAINS.map((d) => `url.ilike.%${d}%`).join(","))
        .limit(500);
      let queueRewrites = 0;
      for (const r of idxRows || []) {
        const { changed, next } = rewriteLegacy((r as any).url);
        if (!changed) continue;
        await sb.from("indexing_urls").upsert(
          [{ url: next, page_type: "other", status: "pending", retry_count: 0, next_retry_at: new Date().toISOString() }],
          { onConflict: "url", ignoreDuplicates: true },
        );
        await sb.from("indexing_urls").delete().eq("id", (r as any).id);
        queueRewrites++;
      }
      summary.steps.push({ name: "rewrite_legacy_domains", db_rows: dbRewrites, queue_rows: queueRewrites });
    }

    // ── 2. Fix missing meta via auto-seo-engine ─────────────────────
    if (action === "fix_missing_meta" || action === "fix_all") {
      const limit = Math.max(1, Math.min(50, body.limit || 25));
      const fixed: Record<string, number> = {};
      for (const { contentType, table } of CONTENT_TABLES) {
        const { data: rows } = await (sb as any)
          .from(table)
          .select("id, meta_title, meta_description")
          .or("meta_title.is.null,meta_description.is.null")
          .limit(limit);
        const ids = (rows || []).map((r: any) => r.id);
        if (!ids.length) { fixed[contentType] = 0; continue; }
        // Delegate to the existing auto-seo-engine bulk_optimize action
        const engineRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/auto-seo-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("Authorization")!,
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({ mode: "bulk_optimize", contentType, pageIds: ids }),
        });
        const json = await engineRes.json().catch(() => ({}));
        fixed[contentType] = (json.results || []).filter((r: any) => r.status === "success").length;
      }
      summary.steps.push({ name: "fix_missing_meta", fixed });
    }

    // ── 3. Flush indexing queue (retry failed + force pending) ──────
    if (action === "flush_indexing" || action === "fix_all") {
      // Reset failed rows so they get picked up
      const { count: resetCount } = await sb
        .from("indexing_urls")
        .update({ status: "pending", retry_count: 0, next_retry_at: new Date().toISOString() }, { count: "exact" })
        .eq("status", "failed");

      // Trigger google-indexing submit_pending in batches of 10
      const flushRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-indexing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization")!,
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({ action: "submit_pending", limit: 10 }),
      });
      const flushJson = await flushRes.json().catch(() => ({}));
      summary.steps.push({ name: "flush_indexing", reset_failed: resetCount || 0, flush: flushJson?.data || flushJson });
    }

    // ── 4. Rebuild & ping sitemap ───────────────────────────────────
    if (action === "rebuild_sitemap" || action === "fix_all") {
      const ping = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-indexing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization")!,
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({ action: "ping_sitemap" }),
      });
      summary.steps.push({ name: "rebuild_sitemap", ok: ping.ok });
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});