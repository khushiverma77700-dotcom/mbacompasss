// Shared: apply a Re-SEO result to page_seo_overrides + source table mirror.
// Used by the worker (for immediate-apply runs) and by seo-reoptimize (Apply button after preview).
import { diffSnapshots, logReseoAudit } from "./reseoAudit.ts";

export const SOURCE_TABLE_BY_TYPE: Record<string, string> = {
  college: "colleges",
  institute: "institutes",
  exam: "exams",
  cityPage: "city_pages",
  article: "articles",
  course: "courses",
  category: "categories",
};

export const SUPPORTS_SEO_COLUMNS = new Set(["college", "institute", "exam", "cityPage", "article"]);

function nowIso() { return new Date().toISOString(); }

/**
 * Apply a Re-SEO result. `payload` may be either a raw pipeline `result`
 * OR a stored `after_snapshot` merged with keyword metadata (from a preview item).
 */
export async function applyReseoResult(sb: any, opts: {
  slug: string;
  runId: string | null;
  pageType: string;
  pageId?: string | null;
  meta_title: string;
  meta_description: string;
  h1: string;
  intro_html?: string;
  body_html?: string;
  primary_keyword?: string | null;
  secondary_keyword?: string | null;
  search_intent?: string | null;
  long_tail_keywords?: string[];
  related_queries?: string[];
  keyword_density?: Record<string, number>;
  faq?: any;
  json_ld?: any;
}) {
  const overridePayload: any = {
    slug: opts.slug,
    title: opts.meta_title,
    description: opts.meta_description,
    h1: opts.h1,
    intro_html: opts.intro_html,
    body_html: opts.body_html,
    keywords: [opts.primary_keyword, opts.secondary_keyword, ...(opts.long_tail_keywords || [])].filter(Boolean),
    faq: opts.faq,
    json_ld: opts.json_ld,
    primary_keyword: opts.primary_keyword,
    secondary_keyword: opts.secondary_keyword,
    search_intent: opts.search_intent,
    long_tail_keywords: opts.long_tail_keywords || [],
    related_queries: opts.related_queries || [],
    keyword_density: opts.keyword_density || {},
    last_reoptimized_at: nowIso(),
    reoptimization_run_id: opts.runId,
    updated_at: nowIso(),
  };
  await sb.from("page_seo_overrides").upsert(overridePayload, { onConflict: "slug" });

  if (opts.pageId && SUPPORTS_SEO_COLUMNS.has(opts.pageType)) {
    const table = SOURCE_TABLE_BY_TYPE[opts.pageType];
    const update: any = {
      meta_title: opts.meta_title,
      meta_description: opts.meta_description,
      keywords: [opts.primary_keyword, opts.secondary_keyword].filter(Boolean),
      primary_keyword: opts.primary_keyword,
    };
    // Probe for h1_tag column via a light select; ignore if missing.
    try {
      const { data: probe } = await sb.from(table).select("h1_tag").eq("id", opts.pageId).maybeSingle();
      if (probe && "h1_tag" in probe) update.h1_tag = opts.h1;
    } catch { /* column may not exist; skip */ }
    try { await sb.from(table).update(update).eq("id", opts.pageId); } catch (e) { console.warn("mirror update failed", e); }
  }
}
