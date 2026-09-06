// seoApply — the single place where an SEO recommendation becomes a real change.
//
// Every recommendation type that can be expressed as page data is written to
// `page_seo_overrides` (title, description, h1, keywords, long-tail keywords,
// FAQ block, JSON-LD schema, answer-first intro, expanded body). Anything that
// genuinely needs a human (design, code, off-page) is reported back as
// `needs_human` so the caller can create a task instead of faking success.
//
// After each write we snapshot the page's before-scores into
// `seo_intel_page_scores` and queue a re-check job so the dashboard can show a
// measured "before 62 → after 78" instead of a claim.

import { logActivity, logAudit, nowIso, today, enqueue } from "./seoIntel.ts";
import { callAIGateway } from "./aiGateway.ts";
import { parseAIJson } from "./seoSignals.ts";

export type ApplyOutcome =
  | { ok: true; kind: string; fields: string[]; detail: string }
  | { ok: false; needs_human: true; reason: string }
  | { ok: false; needs_human: false; reason: string };

const lower = (v: unknown) => String(v ?? "").toLowerCase();

/** Which concrete artefact does this recommendation ask for? */
export function classifyChange(rec: { change_type?: unknown; category?: unknown; recommended_change?: unknown; problem?: unknown }): string {
  const t = `${lower(rec.change_type)} ${lower(rec.category)} ${lower(rec.recommended_change)} ${lower(rec.problem)}`;
  if (/\btitle\b/.test(t)) return "title";
  if (/meta description|meta_description|\bdescription\b|\bmeta\b/.test(t)) return "description";
  if (/\bh1\b|heading tag/.test(t)) return "h1";
  if (/faq|people also ask|question block/.test(t)) return "faq";
  if (/schema|json-?ld|structured data|rich result/.test(t)) return "schema";
  if (/answer-first|answer first|key facts|aeo|geo|snippet|readab/.test(t)) return "answer_block";
  if (/keyword/.test(t)) return "keywords";
  if (/thin content|word count|expand|content depth|content gap|rewrite/.test(t)) return "content";
  if (/internal link|anchor|siloing/.test(t)) return "internal_links";
  return "other";
}

/** Only these can be written straight to page data — everything else is a task. */
export const AUTO_KINDS = new Set([
  "title", "description", "h1", "faq", "schema", "answer_block", "keywords", "content",
]);

export function canAutoApply(rec: any): boolean {
  if (!rec?.path) return false;
  const kind = classifyChange(rec);
  if (!AUTO_KINDS.has(kind)) return false;
  // Plain text fields need a concrete value; generated artefacts can be produced by AI.
  if (kind === "title" || kind === "description" || kind === "h1") {
    return String(rec.after_value ?? "").trim().length >= 10;
  }
  return true;
}

const slugOf = (path: string) => String(path).split("?")[0].split("/").filter(Boolean).pop() ?? "";

interface PageCtx {
  path: string;
  title?: string | null;
  meta_description?: string | null;
  entity_name?: string | null;
  page_type?: string | null;
  primary_keyword?: string | null;
  target_keywords?: unknown;
  health_score?: number | null;
  aeo_score?: number | null;
  health_issues?: unknown;
  avg_position?: number | null;
  clicks?: number | null;
  impressions?: number | null;
}

/** Ask the AI for the exact artefact this recommendation needs. */
async function generateArtefact(kind: string, rec: any, page: PageCtx): Promise<any | null> {
  const shape: Record<string, string> = {
    faq: `{"faq":[{"question":"...","answer":"..."}]}  // 5-7 entries, each answer 40-70 words, factual, no invented statistics`,
    schema: `{"json_ld":{ ...valid schema.org JSON-LD object or @graph... }}`,
    answer_block: `{"intro_html":"<p>...</p><ul><li>...</li></ul>"}  // answer-first: first sentence answers the page's main question in <=40 words, then 4-6 key facts as a list`,
    keywords: `{"primary_keyword":"...","keywords":["..."],"long_tail_keywords":["..."],"intro_html":"<p>...</p>"}  // intro_html must read naturally and include the primary keyword once in the first sentence`,
    content: `{"body_html":"<h2>..</h2><p>..</p>..."}  // 700-1100 words of genuinely useful, formatted HTML (h2/h3, lists, a comparison table where useful). No invented numbers, fees, rankings or testimonials.`,
  };
  const prompt = `You are the implementation engine of an MBA education website's SEO system.
Produce the EXACT artefact requested, as strict JSON, nothing else.

Page: ${page.path}
Page type: ${page.page_type ?? "unknown"}
Entity: ${page.entity_name ?? "—"}
Current title: ${page.title ?? "—"}
Current meta description: ${page.meta_description ?? "—"}
Primary keyword: ${rec.keyword ?? page.primary_keyword ?? "—"}
Target keywords: ${JSON.stringify(page.target_keywords ?? [])}

Problem found: ${rec.problem ?? "—"}
Recommended change: ${rec.recommended_change ?? "—"}
Evidence: ${rec.evidence ?? "—"}

Rules:
- Indian English, professional advisory tone, no emojis, no marketing fluff.
- Never invent fees, rankings, placement numbers, cut-offs, testimonials or dates.
- Output JSON in exactly this shape: ${shape[kind] ?? "{}"}`;

  try {
    const res = await callAIGateway({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a precise SEO implementation engine. Output strict JSON only. Never fabricate metrics." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: kind === "content" ? 3200 : 1600,
    }, { feature: "seo-intel-apply" });
    if (!res.ok) return null;
    const payload = await res.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    return parseAIJson<any>(String(raw));
  } catch (_) {
    return null;
  }
}


/**
 * Applies one recommendation for real.
 * @param actorLabel "admin" | "engine (autonomous)" etc.
 */
export async function applyRecommendation(
  sb: any,
  rec: any,
  opts: { actor?: string | null; actorLabel?: string } = {},
): Promise<ApplyOutcome> {
  const actor = opts.actor ?? null;
  const actorLabel = opts.actorLabel ?? "engine";
  const kind = classifyChange(rec);

  if (!rec?.path) return { ok: false, needs_human: true, reason: "This recommendation is site-wide, so it needs a task rather than a page edit." };
  if (!AUTO_KINDS.has(kind)) {
    return { ok: false, needs_human: true, reason: `"${rec.change_type}" changes cannot be written to page data — a task was created instead.` };
  }

  const slug = slugOf(rec.path);
  if (!slug) return { ok: false, needs_human: true, reason: "No page slug could be derived from this path." };

  const { data: page } = await sb.from("seo_intel_pages")
    .select("path, page_type, entity_name, title, meta_description, primary_keyword, target_keywords, health_score, aeo_score, health_issues, avg_position, clicks, impressions")
    .eq("path", rec.path).maybeSingle();
  const ctx: PageCtx = page ?? { path: rec.path };

  const { data: existing } = await sb.from("page_seo_overrides").select("*").eq("slug", slug).maybeSingle();
  const patch: Record<string, unknown> = { slug, updated_at: nowIso() };
  const fields: string[] = [];
  let before: unknown = null;
  let after: unknown = null;

  if (kind === "title" || kind === "description" || kind === "h1") {
    const value = String(rec.after_value ?? "").trim();
    if (value.length < 10) return { ok: false, needs_human: true, reason: "No concrete replacement text was generated for this field." };
    const col = kind === "description" ? "description" : kind;
    patch[col] = value;
    fields.push(col);
    before = (existing as any)?.[col] ?? (kind === "description" ? ctx.meta_description : ctx.title) ?? null;
    after = value;
  } else {
    const art = await generateArtefact(kind, rec, ctx);
    if (!art) return { ok: false, needs_human: false, reason: "The AI could not produce a usable change — left pending for a retry." };

    if (kind === "faq" && Array.isArray(art.faq) && art.faq.length) {
      patch.faq = art.faq; fields.push("faq");
      before = existing?.faq ?? null; after = art.faq;
    } else if (kind === "schema" && art.json_ld) {
      patch.json_ld = art.json_ld; fields.push("json_ld");
      before = existing?.json_ld ?? null; after = art.json_ld;
    } else if (kind === "answer_block" && art.intro_html) {
      patch.intro_html = art.intro_html; fields.push("intro_html");
      before = existing?.intro_html ?? null; after = art.intro_html;
    } else if (kind === "keywords") {
      if (art.primary_keyword) { patch.primary_keyword = art.primary_keyword; fields.push("primary_keyword"); }
      if (Array.isArray(art.keywords) && art.keywords.length) { patch.keywords = art.keywords; fields.push("keywords"); }
      if (Array.isArray(art.long_tail_keywords) && art.long_tail_keywords.length) { patch.long_tail_keywords = art.long_tail_keywords; fields.push("long_tail_keywords"); }
      if (art.intro_html) { patch.intro_html = art.intro_html; fields.push("intro_html"); }
      before = { primary_keyword: existing?.primary_keyword ?? null, keywords: existing?.keywords ?? null };
      after = { primary_keyword: art.primary_keyword ?? null, keywords: art.keywords ?? null, long_tail_keywords: art.long_tail_keywords ?? null };
    } else if (kind === "content" && art.body_html) {
      patch.body_html = art.body_html; fields.push("body_html");
      before = existing?.body_html ? `${String(existing.body_html).length} chars` : null;
      after = `${String(art.body_html).length} chars`;
    }

    if (!fields.length) return { ok: false, needs_human: false, reason: "The AI response did not contain the field this change needs." };
  }

  const { error: upErr } = await sb.from("page_seo_overrides").upsert(patch, { onConflict: "slug" });
  if (upErr) return { ok: false, needs_human: false, reason: upErr.message };

  // Impact bookkeeping: before-scores now, after-scores when the re-check runs.
  const issuesBefore = Array.isArray(ctx.health_issues) ? (ctx.health_issues as unknown[]).length : null;
  await sb.from("seo_intel_page_scores").insert({
    path: rec.path,
    recommendation_id: rec.id ?? null,
    change_type: String(rec.change_type ?? kind),
    health_before: ctx.health_score ?? null,
    aeo_before: ctx.aeo_score ?? null,
    issues_before: issuesBefore,
    status: "pending",
    detail: `${fields.join(", ")} written from "${rec.recommended_change ?? kind}"`,
  });

  await sb.from("seo_intel_experiments").insert({
    path: rec.path, keyword: rec.keyword ?? null, recommendation_id: rec.id ?? null,
    change_type: rec.change_type ?? kind,
    change_summary: rec.recommended_change ?? `Applied ${fields.join(", ")}`,
    before_value: typeof before === "string" ? before : JSON.stringify(before ?? null).slice(0, 4000),
    after_value: typeof after === "string" ? after : JSON.stringify(after ?? null).slice(0, 4000),
    baseline_position: ctx.avg_position ?? null,
    baseline_clicks: ctx.clicks ?? null,
    baseline_impressions: ctx.impressions ?? null,
    baseline_captured_on: today(),
    changed_on: today(),
    measure_after: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    data_source: "gsc",
    outcome: "pending",
  });

  if (rec.id) {
    await sb.from("seo_intel_recommendations").update({
      status: "applied", applied_at: nowIso(), applied_by: actor,
      reviewed_by: actor, reviewed_at: nowIso(),
    }).eq("id", rec.id);
  }

  await logAudit(sb, {
    actor, actor_label: actorLabel, action: "recommendation_applied",
    entity: "recommendation", entity_id: rec.id ?? null, path: rec.path,
    before_value: { value: before }, after_value: { value: after },
    data_source: rec.data_source ?? null, recommendation_id: rec.id ?? null,
  });
  await logActivity(sb, {
    event: "Change applied to the page",
    detail: `${rec.path} — ${fields.join(", ")}`,
    level: "success", records: 1,
  });

  // Re-measure this page so the impact is real, not assumed.
  await enqueue(sb, {
    job_type: "page_recheck",
    payload: { path: rec.path, recommendation_id: rec.id ?? null },
    priority: 2,
    dedupe_key: `page_recheck:${rec.path}`,
    triggered_by: "apply",
  }).catch(() => undefined);

  return { ok: true, kind, fields, detail: `${fields.join(", ")} updated on ${rec.path}` };
}
