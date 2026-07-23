# Single-Keyword SEO Rebuild + Re-SEO Engine

Rebuild the SEO logic so every page targets **exactly one primary keyword** (optional 1 secondary), and add a **Re-SEO** batch runner in the SEO Dashboard → All Pages tab. Same workflow will be reused by every AI content module.

## 1. Shared SEO Workflow (new Edge Function `seo-reoptimize`)

A single canonical pipeline that runs per page:

```text
Read page  →  Detect topic + search intent  →  Fetch top competitors (Firecrawl/Semrush)
   →  Keyword research (Semrush keyword_research + serp)
   →  Pick 1 primary keyword (+ 1 secondary only if same intent cluster)
   →  Rewrite body if current content ≠ chosen keyword intent
   →  Regenerate: meta title, meta desc, H1, H2/H3 outline, FAQ, JSON-LD,
       canonical, OG/Twitter, image ALTs, internal links, URL slug suggestion
   →  E-E-A-T + readability pass
   →  Persist to page_seo_overrides + content table, log to seo_reoptimization_runs
```

Guardrails baked into the prompt:
- Reject if candidate keyword doesn't match page intent → force rewrite instead of stuffing.
- Strip existing keyword stuffing, remove off-topic secondary keywords.
- Enforce: 1 H1, meta title 50-60ch, meta desc 140-160ch, primary KW in first 100 words + H1 + one H2, natural density.
- Add FAQPage + Article/Breadcrumb schema, entity mentions, semantic variants.
- Optimize for AI answer engines (clear Q→A blocks, definitional first paragraph).

## 2. Database

New tables (migration with GRANTs + RLS admin-only):
- `seo_reoptimization_runs` — batch job (status, totals, started_by, filters).
- `seo_reoptimization_items` — one row per page (page_type, page_id, url, old_primary_kw, new_primary_kw, secondary_kw, intent, rewrite_applied, competitors_json, before/after snapshots, status, error).

Add columns to `page_seo_overrides` (if missing): `secondary_keyword`, `search_intent`, `last_reoptimized_at`, `reoptimization_run_id`.

## 3. SEO Dashboard → All Pages tab

`src/pages/admin/AdminSEODashboard.tsx` (pages tab):
- New **Re-SEO** button (single row) and **Re-SEO Selected / Re-SEO All Filtered** bulk buttons.
- Live progress drawer: page-by-page status (queued → reading → researching → keyword-picked → rewriting → saving → done), with old vs new primary keyword diff and score delta. Same UX pattern as existing bulk WIP dialogs.
- Uses `seo-reoptimize` + a lightweight worker (`seo-reoptimize-worker`) driven by `seo_reoptimization_items` queue, same pattern as `bulk-seo-worker`.

## 4. Unify across all AI content modules

Refactor these to call the shared pipeline (or its `generateSEO(pageContext)` helper) instead of their own prompts:
- `auto-seo-engine`, `bulk-seo-worker`, `ai-seo-enhance`, `ai-blog-writer`, `ai-edit-content`, `ai-expand-content`, `ai-website-optimizer`, `meta-validator-fix`, `seo-auto-fix`, `deep-seo-audit`, `full-page-seo-audit`, `apply-seo-override`.
- Admin surfaces: AdminBulkSEO, AdminContentStudio, AdminWriteBlog, AdminWriteCollege, AdminWriteInstitute, AdminPageEditor, AdminMocksLanding, AdminStaticPageSEO, AdminCTROptimizer, AdminMetaValidator, Landing Page generator.
- Each keeps its own UI; only the SEO generation call changes so output shape (single primary KW, rewrite flag, schema, alts) is identical everywhere.

## 5. Model + sources

- Chat: `openai/gpt-5.5` via Lovable AI Gateway for reasoning/rewrites.
- Competitor + SERP context: Firecrawl (already connected) for top-3 result scrape; Semrush built-in tools for volume/difficulty/intent.
- Accuracy prioritized over speed; per-page timeout generous, background worker with retry.

## Technical details

- New files: `supabase/functions/seo-reoptimize/index.ts`, `supabase/functions/seo-reoptimize-worker/index.ts`, `supabase/functions/_shared/seoPipeline.ts` (shared helper), migration for the two new tables + column adds.
- Modified: `AdminSEODashboard.tsx` (All Pages tab UI + progress drawer component), each existing AI content edge function switched to import `seoPipeline`.
- Concurrency: worker processes N items sequentially per run (configurable, default 3) to stay within gateway limits; self-kick pattern like `master-refresh-worker` with retry cap.
- Backwards compatible: old `primary_keyword` column reused; secondary stored in new column; existing rows untouched until Re-SEO runs on them.

## Out of scope

- No changes to public site rendering beyond consuming the updated `page_seo_overrides` rows (already wired).
- No change to sitemap/robots/SSR — they already read the same overrides.
