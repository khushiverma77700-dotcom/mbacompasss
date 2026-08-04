// entity-stacking — Entity Stacking engine.
//
// Stages:
//   graph    → build/refresh the entity graph (entities + per-page mentions)
//   analyze  → AI recommends missing entities, schema, FAQ and metadata updates
//   apply    → writes approved changes (entity mention, FAQ, schema, meta)
//
// Schema / FAQ / metadata writes land on page_seo_overrides (keyed by path) so
// the SSR layer picks them up consistently; body mentions are inserted into the
// owning table's HTML field and are fully revertible.

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";
import {
  cors, json, loadSettings, loadPages, normalizeEntity, countMentions, parseAIJson, clamp100,
} from "../_shared/seoSignals.ts";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/** Seed the entity library from the site's own structured data. */
async function buildEntityLibrary(sb: any) {
  const entities = new Map<string, { name: string; entity_type: string; official_url?: string | null; description?: string | null }>();
  const add = (name: unknown, entity_type: string, official_url?: unknown, description?: unknown) => {
    const n = String(name ?? "").trim();
    if (n.length < 3) return;
    const key = normalizeEntity(n);
    if (!key || entities.has(key)) return;
    entities.set(key, {
      name: n,
      entity_type,
      official_url: typeof official_url === "string" ? official_url : null,
      description: typeof description === "string" ? description.slice(0, 300) : null,
    });
  };

  const [colleges, exams, institutes, cities, cats] = await Promise.all([
    sb.from("colleges").select("name, website, city, state").limit(1200),
    sb.from("exams").select("name, official_website").limit(200),
    sb.from("institutes").select("name, city").limit(1200),
    sb.from("city_pages").select("name, state").limit(300),
    sb.from("categories").select("name").limit(200),
  ]);

  for (const c of colleges.data ?? []) { add(c.name, "institution", c.website); add(c.city, "city"); add(c.state, "city"); }
  for (const e of exams.data ?? []) add(e.name, "exam", e.official_website);
  for (const i of institutes.data ?? []) { add(i.name, "organization"); add(i.city, "city"); }
  for (const c of cities.data ?? []) { add(c.name, "city"); add(c.state, "city"); }
  for (const c of cats.data ?? []) add(c.name, "concept");

  const rows = Array.from(entities.entries()).map(([normalized_name, e]) => ({
    normalized_name,
    name: e.name,
    entity_type: e.entity_type,
    official_url: e.official_url,
    description: e.description,
    importance: e.entity_type === "exam" ? 90 : e.entity_type === "institution" ? 80 : 55,
  }));

  for (let i = 0; i < rows.length; i += 400) {
    await sb.from("seo_entities").upsert(rows.slice(i, i + 400), { onConflict: "normalized_name" });
  }
  return rows.length;
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
  const stage: string = body.stage ?? "graph";
  let runId: string | null = body.run_id ?? null;

  try {
    const settings = await loadSettings(sb);

    /* --------------------------------- GRAPH ------------------------------ */
    if (stage === "graph") {
      const { data: run } = await sb.from("entity_runs")
        .insert({ status: "running", stage: "graph" }).select("id").single();
      runId = run?.id ?? null;

      const total = await buildEntityLibrary(sb);
      const { data: entities } = await sb.from("seo_entities")
        .select("id, name, normalized_name, entity_type, aliases, importance")
        .order("importance", { ascending: false }).limit(1500);

      const offset = Number(body.offset ?? 0);
      const pages = (await loadPages(sb)).slice(offset, offset + 250);

      const mentionRows: any[] = [];
      const counts = new Map<string, number>();

      for (const page of pages) {
        const haystack = `${page.name ?? ""} ${page.text}`.slice(0, 20000);
        let matched = 0;
        for (const ent of entities ?? []) {
          const n = countMentions(haystack, ent.name, (ent.aliases ?? []) as string[]);
          if (n === 0) continue;
          matched++;
          counts.set(ent.id, (counts.get(ent.id) ?? 0) + 1);
          mentionRows.push({
            path: page.path,
            entity_id: ent.id,
            mentions: n,
            in_meta: countMentions(page.name ?? "", ent.name) > 0,
            prominence: clamp100(n * 10 + (countMentions(page.name ?? "", ent.name) > 0 ? 30 : 0)),
          });
          if (matched >= 40) break;
        }
      }

      for (let i = 0; i < mentionRows.length; i += 400) {
        await sb.from("page_entities").upsert(mentionRows.slice(i, i + 400), { onConflict: "path,entity_id" });
      }
      for (const [id, n] of counts) await sb.from("seo_entities").update({ page_count: n }).eq("id", id);

      const hasMore = (await loadPages(sb)).length > offset + 250;
      await sb.from("entity_runs").update({
        stage: hasMore ? "graph" : "graph_done",
        pages_scanned: offset + pages.length,
        entities_total: total,
        notes: [`Entity library: ${total} entities. Scanned ${offset + pages.length} pages.`],
      }).eq("id", runId);

      return json({
        run_id: runId, stage: "graph",
        next_stage: hasMore ? "graph" : "analyze",
        next_offset: hasMore ? offset + 250 : null,
        entities: total, pages_scanned: pages.length,
      });
    }

    /* -------------------------------- ANALYZE ----------------------------- */
    if (stage === "analyze") {
      if (!runId) return json({ error: "run_id is required for the analyze stage." }, 400);
      const batch = Math.min(Number(body.batch ?? 6), 10);

      const { data: health } = await sb.from("seo_page_health")
        .select("path").order("impressions", { ascending: false }).limit(400);
      const { data: already } = await sb.from("entity_recommendations")
        .select("path").eq("run_id", runId);
      const done = new Set((already ?? []).map((r: any) => r.path));

      const allPages = await loadPages(sb);
      const ranked = (health?.length
        ? allPages.filter((p) => health.some((h: any) => h.path === p.path))
        : allPages
      ).filter((p) => !done.has(p.path));
      const todo = ranked.slice(0, batch);

      if (!todo.length) {
        const { count } = await sb.from("entity_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", runId);
        await sb.from("entity_runs").update({
          status: "completed", stage: "analyze_done",
          recommendations: count ?? 0, finished_at: new Date().toISOString(),
        }).eq("id", runId);
        return json({ run_id: runId, stage: "analyze", done: true, recommendations: count ?? 0 });
      }

      let created = 0;
      for (const page of todo) {
        const { data: present } = await sb.from("page_entities")
          .select("mentions, prominence, seo_entities(name, entity_type)")
          .eq("path", page.path).order("prominence", { ascending: false }).limit(30);

        const prompt = `You are an entity SEO / knowledge-graph specialist for MBACompass.in (Indian MBA admissions).

PAGE
Path: ${page.path}
Name: ${page.name ?? "unknown"} (type: ${page.page_type})
Primary keyword: ${page.keyword ?? "not set"}
Word count: ${page.words}

ENTITIES ALREADY MENTIONED
${(present ?? []).map((p: any) => `- ${p.seo_entities?.name} (${p.seo_entities?.entity_type}) x${p.mentions}`).join("\n") || "(none detected)"}

CONTENT EXCERPT
${page.text.slice(0, 5000) || "(empty)"}

TASK
Strengthen this page's entity coverage so Google and AI answer engines understand it precisely.
Recommend only entities that genuinely belong on this page (real Indian B-schools, entrance exams, cities, programmes, recognised bodies such as AICTE / NAAC / NIRF / AACSB).
Never invent statistics, fees, cutoffs or dates.

Return ONLY JSON:
{
  "entity_coverage": 0-100,
  "recommendations": [
    {
      "action": "add_mention" | "add_schema" | "add_faq" | "update_meta",
      "entity_name": "exact entity name",
      "entity_type": "institution|exam|city|program|organization|concept|other",
      "payload": {
        "sentence": "for add_mention: one editorial sentence naming the entity, safe to append",
        "schema": { "@type": "", "name": "", "sameAs": [] },
        "faq": { "q": "", "a": "" },
        "title": "for update_meta",
        "description": "for update_meta, <=155 chars"
      },
      "problem": "",
      "rationale": "",
      "seo_impact": "",
      "priority": "high|medium|low",
      "confidence": 0.0-1.0
    }
  ]
}`;

        const resp = await callAIGateway(
          {
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an entity SEO specialist. Output valid JSON only. Never fabricate facts, dates, fees or rankings." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          },
          { feature: "entity-stacking", purpose: "long" },
        );

        if (!resp.ok) {
          console.error("[entity-stacking] AI error", resp.status, await resp.text());
          continue;
        }
        const payload = await resp.json().catch(() => null);
        const parsed = parseAIJson<any>(payload?.choices?.[0]?.message?.content ?? "");
        if (!parsed) continue;

        await sb.from("seo_page_health").upsert({
          path: page.path,
          page_type: page.page_type,
          page_name: page.name,
          source_table: page.source_table,
          source_id: page.source_id,
          entity_score: Number(parsed.entity_coverage ?? 0),
          entity_coverage: Number(parsed.entity_coverage ?? 0),
          missing_entities: (parsed.recommendations ?? []).map((r: any) => r.entity_name).filter(Boolean).slice(0, 20),
        }, { onConflict: "path" });

        for (const r of (parsed.recommendations ?? []).slice(0, 8)) {
          const { data: ent } = await sb.from("seo_entities")
            .select("id").eq("normalized_name", normalizeEntity(r.entity_name ?? "")).maybeSingle();
          const safe = r.action === "add_schema" || r.action === "add_faq";
          const priorityWeight = r.priority === "high" ? 3 : r.priority === "medium" ? 2 : 1;

          await sb.from("entity_recommendations").insert({
            run_id: runId,
            path: page.path,
            page_name: page.name,
            page_type: page.page_type,
            source_table: page.source_table,
            source_id: page.source_id,
            source_field: page.source_field,
            action: r.action ?? "add_mention",
            entity_id: ent?.id ?? null,
            entity_name: r.entity_name ?? null,
            entity_type: r.entity_type ?? null,
            payload: r.payload ?? {},
            problem: r.problem ?? null,
            rationale: r.rationale ?? null,
            seo_impact: r.seo_impact ?? null,
            priority: r.priority ?? "medium",
            confidence: r.confidence ?? null,
            score: priorityWeight * 100,
            status: safe && settings.auto_apply_safe_actions ? "approved" : "pending",
          });
          created++;
        }
      }

      return json({ run_id: runId, stage: "analyze", next_stage: "analyze", processed: todo.length, created });
    }

    /* --------------------------------- APPLY ------------------------------ */
    if (stage === "apply") {
      const ids: string[] = Array.isArray(body.recommendation_ids) ? body.recommendation_ids : [];
      if (!ids.length) return json({ error: "recommendation_ids is required." }, 400);

      const { data: recs } = await sb.from("entity_recommendations").select("*").in("id", ids);
      const results: any[] = [];

      for (const rec of recs ?? []) {
        try {
          const { data: override } = await sb.from("page_seo_overrides")
            .select("slug, title, description, faq, json_ld").eq("slug", rec.path).maybeSingle();

          if (rec.action === "add_mention") {
            const sentence = String(rec.payload?.sentence ?? "").trim();
            if (!sentence || !rec.source_table || !rec.source_id || !rec.source_field) {
              throw new Error("Missing mention sentence or target field.");
            }
            const { data: row } = await sb.from(rec.source_table)
              .select(`id, ${rec.source_field}`).eq("id", rec.source_id).maybeSingle();
            const before = String((row as any)?.[rec.source_field] ?? "");
            const after = `${before}${before.trim().endsWith(">") || before === "" ? "" : " "}\n<p>${sentence}</p>`;
            await sb.from(rec.source_table).update({ [rec.source_field]: after }).eq("id", rec.source_id);
            await sb.from("entity_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: rec.action, path: rec.path,
              source_table: rec.source_table, source_id: rec.source_id, source_field: rec.source_field,
              revert_payload: { type: "field", table: rec.source_table, id: rec.source_id, field: rec.source_field, before },
            });
          } else if (rec.action === "add_faq") {
            const faq = rec.payload?.faq;
            if (!faq?.q || !faq?.a) throw new Error("Missing FAQ question or answer.");
            const current = Array.isArray(override?.faq) ? override!.faq : (override?.faq?.items ?? []);
            const next = [...current, { question: faq.q, answer: faq.a }];
            await sb.from("page_seo_overrides").upsert({ slug: rec.path, faq: next }, { onConflict: "slug" });
            await sb.from("entity_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: rec.action, path: rec.path,
              revert_payload: { type: "override", slug: rec.path, column: "faq", before: override?.faq ?? null },
            });
          } else if (rec.action === "add_schema") {
            const schema = rec.payload?.schema;
            if (!schema) throw new Error("Missing schema payload.");
            const base = override?.json_ld ?? {};
            const mentions = Array.isArray((base as any).mentions) ? (base as any).mentions : [];
            const next = { ...base, mentions: [...mentions, schema] };
            await sb.from("page_seo_overrides").upsert({ slug: rec.path, json_ld: next }, { onConflict: "slug" });
            await sb.from("entity_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: rec.action, path: rec.path,
              revert_payload: { type: "override", slug: rec.path, column: "json_ld", before: override?.json_ld ?? null },
            });
          } else if (rec.action === "update_meta") {
            const title = rec.payload?.title ?? override?.title ?? null;
            const description = rec.payload?.description ?? override?.description ?? null;
            await sb.from("page_seo_overrides").upsert({ slug: rec.path, title, description }, { onConflict: "slug" });
            await sb.from("entity_actions").insert({
              run_id: rec.run_id, recommendation_id: rec.id, action: rec.action, path: rec.path,
              revert_payload: { type: "override_meta", slug: rec.path, title: override?.title ?? null, description: override?.description ?? null },
            });
          } else {
            throw new Error(`Unsupported action: ${rec.action}`);
          }

          if (rec.entity_id) {
            await sb.from("page_entities").upsert({
              path: rec.path, entity_id: rec.entity_id, mentions: 1,
              in_schema: rec.action === "add_schema",
              in_faq: rec.action === "add_faq",
              in_meta: rec.action === "update_meta",
            }, { onConflict: "path,entity_id" });
          }

          await sb.from("entity_recommendations").update({
            status: "applied", applied_at: new Date().toISOString(), error: null,
          }).eq("id", rec.id);
          results.push({ id: rec.id, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await sb.from("entity_recommendations").update({ status: "failed", error: msg }).eq("id", rec.id);
          results.push({ id: rec.id, ok: false, error: msg });
        }
      }

      if (recs?.[0]?.run_id) {
        const { count } = await sb.from("entity_recommendations")
          .select("id", { count: "exact", head: true }).eq("run_id", recs[0].run_id).eq("status", "applied");
        await sb.from("entity_runs").update({ applied: count ?? 0 }).eq("id", recs[0].run_id);
      }
      return json({ applied: results.filter((r) => r.ok).length, results });
    }

    if (stage === "reject") {
      const ids: string[] = Array.isArray(body.recommendation_ids) ? body.recommendation_ids : [];
      if (!ids.length) return json({ error: "recommendation_ids is required." }, 400);
      await sb.from("entity_recommendations").update({ status: "rejected" }).in("id", ids);
      return json({ rejected: ids.length });
    }

    if (stage === "revert") {
      const actionId = body.action_id;
      if (!actionId) return json({ error: "action_id is required." }, 400);
      const { data: action } = await sb.from("entity_actions").select("*").eq("id", actionId).maybeSingle();
      if (!action) return json({ error: "Action not found." }, 404);
      const rp = action.revert_payload ?? {};

      if (rp.type === "field") {
        await sb.from(rp.table).update({ [rp.field]: rp.before }).eq("id", rp.id);
      } else if (rp.type === "override") {
        await sb.from("page_seo_overrides").update({ [rp.column]: rp.before }).eq("slug", rp.slug);
      } else if (rp.type === "override_meta") {
        await sb.from("page_seo_overrides").update({ title: rp.title, description: rp.description }).eq("slug", rp.slug);
      }

      await sb.from("entity_actions").update({ status: "reverted", reverted_at: new Date().toISOString() }).eq("id", actionId);
      if (action.recommendation_id) {
        await sb.from("entity_recommendations").update({ status: "reverted" }).eq("id", action.recommendation_id);
      }
      return json({ reverted: true });
    }

    return json({ error: `Unknown stage: ${stage}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[entity-stacking]", msg);
    if (runId) {
      await sb.from("entity_runs").update({
        status: "failed", error: msg, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: msg }, 500);
  }
});
