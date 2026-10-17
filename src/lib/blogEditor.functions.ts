// AI Blog Writer — editor workspace (phases 8-12): SEO analysis, content
// quality, fact check, humanize, fix issues, internal links and publish.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeBlogDeterministic, type BoundaryInput } from "./blogSeoScore";

const MODEL = "openai/gpt-6-astra";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can use the blog editor.");
}

/** Streams a Responses call with a strict JSON schema and returns the parsed object. */
async function callJson<T>(name: string, system: string, user: string, schema: Record<string, unknown>): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("The AI service is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: { type: "json_schema", name, schema, strict: true } },
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error("[blog-editor] gateway", res.status, detail.slice(0, 300));
    if (res.status === 429) throw new Error("The AI service is busy. Wait a minute and try again.");
    if (res.status === 402) throw new Error("The AI workspace is out of credits.");
    if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
    throw new Error("The AI service could not be reached.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let refused = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
          if (ev.type === "response.refusal.delta") refused = true;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error(ev?.error?.message || "The AI request failed.");
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  if (refused && !text) throw new Error("The AI declined this request.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The AI reply could not be read. Try again.");
  }
}

const str = { type: "string" };
const strArr = { type: "array", items: str };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});

const boundarySchema = z
  .object({
    mustInclude: z.array(z.string()).default([]),
    canInclude: z.array(z.string()).default([]),
    mustNotInclude: z.array(z.string()).default([]),
    allowedEntities: z.array(z.string()).default([]),
  })
  .nullable()
  .optional();

const articleInput = z.object({
  articleId: z.string().uuid(),
  jobId: z.string().uuid().optional().nullable(),
  targetDensity: z.number().min(0).max(10).optional().nullable(),
  boundary: boundarySchema,
  searchIntent: z.string().max(200).optional().nullable(),
});

async function loadArticle(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, intro, content, meta_title, meta_description, h1_tag, primary_keyword, keywords, faqs, published, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Article not found.");
  return data as Record<string, any>;
}

async function loadSources(supabase: any, jobId?: string | null) {
  if (!jobId) return [] as { url: string; title: string; kind: string; excerpt: string }[];
  const { data } = await supabase.from("ai_blog_generation_jobs").select("stats").eq("id", jobId).maybeSingle();
  const list = (data?.stats as any)?.sourceExcerpts;
  return Array.isArray(list) ? list.slice(0, 8) : [];
}

const htmlOf = (a: Record<string, any>) => `${a.intro || ""}\n${a.content || ""}`;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

const EDITOR_SYSTEM = `You are a senior SEO editor, fact checker and education journalist for MBA Compass (Indian MBA guidance).
Rules: Accuracy > word count. Relevance > length. Readability > keyword density. If you don't know, don't invent.
Never introduce colleges, exams or statistics outside the topic boundary. Never fabricate sources or URLs.`;

// ---------- Analyze SEO + content quality ----------
export const analyzeBlogArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => articleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const a = await loadArticle(context.supabase, data.articleId);
    const boundary = (data.boundary || null) as BoundaryInput | null;
    const det = analyzeBlogDeterministic({
      title: a.title,
      h1: a.h1_tag,
      slug: a.slug,
      metaTitle: a.meta_title,
      metaDescription: a.meta_description,
      keyword: a.primary_keyword || a.title,
      intro: a.intro || "",
      content: a.content || "",
      targetDensity: data.targetDensity ?? 1,
      boundary,
    });

    const ai = await callJson<{
      searchIntentMatch: number; originality: number; freshness: number; readability: number;
      topicRelevance: number; accuracy: number; humanization: number; unnecessaryContent: number;
      repetition: number; factualConfidence: number; completeness: number;
      issues: { title: string; detail: string; category: string; severity: string; safeToAutoFix: boolean }[];
    }>(
      "blog_analysis",
      EDITOR_SYSTEM,
      `Score this article 0-100 on each dimension and list exact, actionable issues (max 12). Do not repeat issues already detected by code: ${det.issues.map((i) => i.title).join("; ") || "none"}.
Title: ${a.title}
Primary keyword: ${a.primary_keyword}
Search intent: ${data.searchIntent || "infer"}
Topic boundary: ${boundary ? JSON.stringify(boundary) : "infer strictly from the title"}
Article HTML:
${clip(htmlOf(a), 60000)}`,
      obj({
        searchIntentMatch: { type: "number" }, originality: { type: "number" }, freshness: { type: "number" },
        readability: { type: "number" }, topicRelevance: { type: "number" }, accuracy: { type: "number" },
        humanization: { type: "number" }, unnecessaryContent: { type: "number" }, repetition: { type: "number" },
        factualConfidence: { type: "number" }, completeness: { type: "number" },
        issues: {
          type: "array",
          items: obj({ title: str, detail: str, category: { type: "string", enum: ["seo", "quality", "accuracy", "humanization"] }, severity: { type: "string", enum: ["high", "medium", "low"] }, safeToAutoFix: { type: "boolean" } }),
        },
      }),
    );
    const c = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

    const seoParts = [
      { label: "Search intent match", score: c(ai.searchIntentMatch) },
      ...det.seoParts,
      { label: "Readability", score: c(ai.readability) },
      { label: "Originality", score: c(ai.originality) },
      { label: "Content freshness", score: c(ai.freshness) },
    ];
    const seoScore = Math.round(seoParts.reduce((s, p) => s + p.score, 0) / seoParts.length);
    const qualityParts = [
      { label: "Topic relevance", score: Math.min(c(ai.topicRelevance), det.offTopicEntities.length ? 60 : 100) },
      { label: "Accuracy", score: c(ai.accuracy) },
      { label: "Humanization", score: Math.min(c(ai.humanization), det.humanizationCap) },
      { label: "Readability", score: c(ai.readability) },
      { label: "No unnecessary content", score: c(ai.unnecessaryContent) },
      { label: "No repetition", score: Math.min(c(ai.repetition), det.repetitionCap) },
      { label: "Factual confidence", score: c(ai.factualConfidence) },
      { label: "Completeness", score: c(ai.completeness) },
    ];
    const qualityScore = Math.round(qualityParts.reduce((s, p) => s + p.score, 0) / qualityParts.length);
    const issues = [
      ...det.issues,
      ...(ai.issues || []).slice(0, 12).map((i, n) => ({ id: `ai-${n}`, ...i })),
    ];
    return {
      seoScore,
      qualityScore,
      humanizationScore: qualityParts[2].score,
      accuracyScore: qualityParts[1].score,
      seoParts,
      qualityParts,
      density: det.density,
      wordCount: det.wordCount,
      offTopicEntities: det.offTopicEntities,
      bannedFound: det.bannedFound,
      checklist: det.checklist,
      issues,
    };
  });

// ---------- Fact check ----------
export const factCheckBlogArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => articleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const a = await loadArticle(context.supabase, data.articleId);
    const sources = await loadSources(context.supabase, data.jobId);
    const res = await callJson<{ claims: { claim: string; status: string; source: string; note: string }[] }>(
      "blog_fact_check",
      EDITOR_SYSTEM,
      `List every factual claim in the article that a reader could rely on (fees, dates, rankings, percentiles, placements, eligibility, statistics, named institutions). For each, set status:
- "verified": the exact figure appears in a source excerpt below.
- "source_supported": consistent with a source but worded/rounded differently.
- "potentially_outdated": time-sensitive and the source is older or the year differs.
- "needs_review": not found in any source.
Set "source" to the source URL used, or "" when none. Never invent URLs. Note in one short line what to check.

SOURCES:
${sources.length ? sources.map((s) => `URL: ${s.url}\n${s.excerpt}`).join("\n\n---\n\n") : "(no sources were read for this article)"}

ARTICLE:
${clip(htmlOf(a), 60000)}`,
      obj({ claims: { type: "array", items: obj({ claim: str, status: { type: "string", enum: ["verified", "source_supported", "potentially_outdated", "needs_review"] }, source: str, note: str }) } }),
    );
    const allowed = new Set(sources.map((s) => s.url));
    return {
      claims: (res.claims || []).slice(0, 60).map((c) => ({ ...c, source: allowed.has(c.source) ? c.source : "" })),
      sourceCount: sources.length,
    };
  });


// ---------- Figure review: missing / outdated / conflicting figures ----------
export const reviewBlogFigures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => articleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const a = await loadArticle(context.supabase, data.articleId);
    const sources = await loadSources(context.supabase, data.jobId);
    if (!sources.length) return { items: [], sourceCount: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const res = await callJson<{ items: { type: string; figure: string; articleValue: string; sourceValue: string; source: string; explanation: string; suggestion: string }[] }>(
      "blog_figure_review",
      EDITOR_SYSTEM,
      `Compare every number, fee, date, deadline, percentile, ranking, seat count and placement figure in the ARTICLE with the SOURCES. Today is ${today}. Report only real problems:
- "conflicting": the article value differs from the value a source gives for the same thing (articleValue vs sourceValue).
- "outdated": the article uses an older year or cycle than a source provides, or the figure is clearly from an older cycle.
- "missing": an important figure in the sources that the article's topic needs but omits, OR a figure in the article not present in any source (sourceValue "").
Set "source" to the exact source URL, or "" when none. Never invent values or URLs. "suggestion" is one short instruction for the editor. Max 30 items.

SOURCES:
${sources.map((s) => `URL: ${s.url}\n${s.excerpt}`).join("\n\n---\n\n").slice(0, 90000)}

ARTICLE:
${clip(htmlOf(a), 60000)}`,
      obj({ items: { type: "array", items: obj({ type: { type: "string", enum: ["missing", "outdated", "conflicting"] }, figure: str, articleValue: str, sourceValue: str, source: str, explanation: str, suggestion: str }) } }),
    );
    const allowed = new Set(sources.map((s) => s.url));
    return {
      items: (res.items || []).slice(0, 30).map((i) => ({ ...i, source: allowed.has(i.source) ? i.source : "" })),
      sourceCount: sources.length,
    };
  });

// ---------- Rewrite (humanize / fix one / fix all / apply links) ----------
const rewriteInput = articleInput.extend({
  mode: z.enum(["humanize", "fix", "fix_all", "links"]),
  issues: z.array(z.object({ title: z.string().max(400), detail: z.string().max(2000) })).max(30).optional(),
  links: z.array(z.object({ anchor: z.string().max(200), target: z.string().max(300), location: z.string().max(300) })).max(20).optional(),
});

export const rewriteBlogArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rewriteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const a = await loadArticle(context.supabase, data.articleId);
    const task =
      data.mode === "humanize"
        ? `Run a humanization pass: vary sentence and paragraph length, smooth transitions, remove repetition, robotic phrasing, generic AI phrases, unnecessary headings and bullet lists, repeated conclusions and keyword stuffing. Keep every fact, figure, table, link and heading meaning.`
        : data.mode === "links"
          ? `Insert these internal links naturally at the suggested locations, using the anchor text inside an existing or lightly reworded sentence. Do not add any other links:\n${(data.links || []).map((l) => `- anchor "${l.anchor}" -> ${l.target} (${l.location})`).join("\n")}`
          : `Fix ${data.mode === "fix_all" ? "these issues" : "this issue"} with the smallest safe edit, preserving meaning and style. Never add figures that are not already in the article; if an issue needs new data, add a short note to confirm on the official website instead:\n${(data.issues || []).map((i) => `- ${i.title}: ${i.detail}`).join("\n")}`;
    const out = await callJson<{ intro: string; content: string; metaTitle: string; metaDescription: string; changeSummary: string }>(
      "blog_rewrite",
      EDITOR_SYSTEM,
      `${task}

Topic boundary: ${data.boundary ? JSON.stringify(data.boundary) : "strictly the title"}
Primary keyword: ${a.primary_keyword}
Return the full revised intro HTML and content HTML (same allowed tags: h2,h3,h4,p,ul,ol,li,strong,em,a,table,thead,tbody,tr,th,td,blockquote; keep existing id attributes on headings), plus meta title (<= 60 chars) and meta description (140-160 chars). Return the originals unchanged if no edit is needed there.

META TITLE: ${a.meta_title}
META DESCRIPTION: ${a.meta_description}
INTRO HTML:
${a.intro}
CONTENT HTML:
${clip(a.content || "", 70000)}`,
      obj({ intro: str, content: str, metaTitle: str, metaDescription: str, changeSummary: str }),
    );
    if (!out.content || out.content.length < (a.content || "").length * 0.5) {
      throw new Error("The AI returned an incomplete article, so nothing was changed. Try again.");
    }
    const strip = (h: string) => h.replace(/<\/?(script|style|iframe)[^>]*>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
    const patch = {
      intro: strip(out.intro || a.intro),
      content: strip(out.content),
      meta_title: (out.metaTitle || a.meta_title || "").slice(0, 70),
      meta_description: (out.metaDescription || a.meta_description || "").slice(0, 170),
    };
    const { error } = await context.supabase.from("articles").update(patch).eq("id", a.id);
    if (error) throw new Error(`Could not save the change: ${error.message}`);
    return { changeSummary: out.changeSummary || "Updated." };
  });

// ---------- Internal link suggestions ----------
export const suggestBlogInternalLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => articleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const a = await loadArticle(context.supabase, data.articleId);
    const [arts, cols, exams] = await Promise.all([
      context.supabase.from("articles").select("slug, title").eq("published", true).neq("id", a.id).limit(400),
      context.supabase.from("colleges").select("slug, name").limit(600),
      context.supabase.from("exams").select("slug, name").limit(100),
    ]);
    const pages: { path: string; label: string }[] = [
      ...((arts.data || []) as any[]).filter((r) => r.slug && r.title).map((r) => ({ path: `/article/${r.slug}`, label: r.title })),
      ...((cols.data || []) as any[]).filter((r) => r.slug && r.name).map((r) => ({ path: `/college/${r.slug}`, label: r.name })),
      ...((exams.data || []) as any[]).filter((r) => r.slug && r.name).map((r) => ({ path: `/exams/${r.slug}`, label: r.name })),
      { path: "/tools/college-shortlister", label: "MBA college shortlister" },
      { path: "/mba-roi-calculator", label: "MBA ROI calculator" },
      { path: "/tools/profile-analyzer", label: "MBA profile analyzer" },
      { path: "/mocks", label: "CAT and XAT mock tests" },
      { path: "/mba-application", label: "MBA application tracker" },
    ];
    const valid = new Set(pages.map((p) => p.path));
    const res = await callJson<{ links: { anchor: string; target: string; location: string; reason: string }[] }>(
      "blog_internal_links",
      EDITOR_SYSTEM,
      `Suggest up to 8 internal links that genuinely help a reader of this article. Only choose targets from the PAGE LIST (exact path). Skip pages outside the topic boundary. Skip targets already linked in the article. Anchor text must be a natural phrase that exists or fits in the article.
Topic boundary: ${data.boundary ? JSON.stringify(data.boundary) : "strictly the title"}
PAGE LIST:
${pages.map((p) => `${p.path} | ${p.label}`).join("\n").slice(0, 40000)}

ARTICLE:
${clip(htmlOf(a), 40000)}`,
      obj({ links: { type: "array", items: obj({ anchor: str, target: str, location: str, reason: str }) } }),
    );
    return { links: (res.links || []).filter((l) => valid.has(l.target)).slice(0, 8) };
  });

// ---------- Save manual edits / publish ----------
const saveInput = z.object({
  articleId: z.string().uuid(),
  title: z.string().min(3).max(200),
  h1: z.string().max(200),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  metaTitle: z.string().max(80),
  metaDescription: z.string().max(200),
  intro: z.string().max(200000),
  content: z.string().max(400000),
  publish: z.boolean().optional(),
});

export const saveBlogArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: clash } = await context.supabase.from("articles").select("id").eq("slug", data.slug).neq("id", data.articleId).maybeSingle();
    if (clash) throw new Error("Another article already uses this URL slug.");
    const patch: Record<string, unknown> = {
      title: data.title,
      h1_tag: data.h1,
      slug: data.slug,
      meta_title: data.metaTitle,
      meta_description: data.metaDescription,
      intro: data.intro,
      content: data.content,
    };
    if (data.publish) {
      patch.published = true;
      patch.status = "published";
    }
    const { error } = await context.supabase.from("articles").update(patch as any).eq("id", data.articleId);
    if (error) throw new Error(`Could not save: ${error.message}`);
    return { ok: true, slug: data.slug, published: !!data.publish };
  });
