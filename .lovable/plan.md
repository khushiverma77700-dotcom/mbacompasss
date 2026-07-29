# Image SEO Automation System

Ship a site-wide image optimization pipeline that fixes every existing image and auto-processes every future upload, without changing how any image looks on screen.

## Scope guardrails

- No visual changes: same dimensions, same aspect ratio, same crop, same rendered size. Only bytes, filenames, `alt`/`title`/`loading`/`width`/`height`, `srcset`/`sizes`, schema, and sitemap change.
- Originals are preserved. Every optimization writes a new derivative; the original URL keeps working as a fallback.

## 1. Storage & derivatives

- New private bucket `image-derivatives` holding WebP/AVIF variants at responsive widths (320, 640, 960, 1280, 1600) plus a compressed original.
- New table `image_assets` — one row per canonical image URL found on the site. Columns: source URL, bucket/key (if native), width, height, bytes, format, sha256 hash (dedupe), alt, title, caption, seo_filename, page_context (jsonb: which tables/rows reference it), variants (jsonb with webp/avif URLs per width), lcp_candidate boolean, status, last_optimized_at, issues (jsonb).
- New table `image_seo_issues` — normalized findings per asset (missing_alt, duplicate_alt, oversized, broken, no_sitemap_entry, etc.) so the dashboard can filter/count.
- New table `image_optimization_jobs` — background queue rows with per-step status for the upload checklist UI.

## 2. Background workers (edge functions)

- `image-audit-crawler` — walks every content table with image columns (`colleges`, `institutes`, `articles`, `news_articles`, `mba_compass_courses`, `banners`, `city_pages`, `exams`, `categories`, `freebies`, `authors`/profiles, `mocks_landing_settings`, homepage `site_settings`, plus rendered HTML in `description`/`content` fields) and upserts `image_assets` rows with page_context.
- `image-optimizer-worker` — for each asset: fetch bytes, compute hash, decode dimensions, produce compressed original + WebP + AVIF at responsive widths using `sharp` (Deno-compatible via `npm:sharp-wasm` or a Node runtime edge function; if unavailable in Deno, run through an existing Node-capable path — decide at build time and document the fallback).
- `image-seo-writer` — calls Lovable AI Gateway (`google/gemini-2.5-flash`) with page_context to generate alt, title, caption, and SEO filename. Deduplicates alt within the same page. Never overwrites human-written alt unless flagged generic/duplicate.
- `image-sitemap-builder` — writes `/sitemap-images.xml` served by an extended `serve-sitemap`; referenced from `robots.txt` and the sitemap index.
- `image-dashboard-stats` — aggregates counts for the admin dashboard.

Queued via existing `pg_cron` pattern used by `sitemap-refresh-cron`/`seo-health-check`.

## 3. Runtime delivery (no visual changes)

- New `<SmartImage>` component wrapping `<img>`. It:
  - Looks up the URL in `image_assets` (in-memory map hydrated at page load, one query per route).
  - If variants exist, emits `<picture>` with AVIF → WebP → original `<source>`s plus responsive `srcset` on the fallback `<img>`.
  - Injects `width`/`height` (intrinsic, unchanged) so CLS drops to 0.
  - Sets `loading="lazy"` and `decoding="async"` by default; `loading="eager"` + `fetchpriority="high"` when the row is marked `lcp_candidate` (homepage hero, article hero, college banner top-of-page).
  - Uses stored alt/title. Renders exactly the same box — sizing stays governed by the existing wrapper's CSS.
- Codemod-style sweep: replace `<img>` in shared UI (`ArticleCard`, `CollegeListingCard`, `Hero*`, `CityBanner`, `AuthorAvatar`, blog TipTap render, homepage banners) with `<SmartImage>`. Do NOT touch admin-only images.

## 4. Upload automation

- Extend `src/components/admin/FileUpload.tsx` (single central component) so every existing admin upload flows through it. On upload:
  1. PUT original into current bucket (behavior unchanged).
  2. Insert `image_optimization_jobs` row with the 17 checklist steps.
  3. Invoke `image-optimizer-worker` in background; UI subscribes via Realtime and renders the checklist popover.
  4. On completion, `image_assets` row is populated; the returned URL in the admin form still points at the original — `<SmartImage>` handles delivery on the public site.
- Callers that upload outside this component (`AdminFreebies`, `AdminDatabaseBackup` — backup is out of scope; `StudentSupport` attachments — out of scope) either route through `FileUpload` or get a small `enqueueImageOptimization(url)` helper.

## 5. Structured data & Open Graph

- `SEOHead` / `useResolvedSeo` already emit JSON-LD. Extend the schema generators (`generateCollegeSchema`, `generateArticleSchema`, `generateExamSchema`, `generateOrganizationSchema`, breadcrumb) to include `image` arrays sourced from `image_assets` for the current record. Never emit empty/duplicate image URLs.
- Sitewide `og:image` fallback in `index.html` stays. Per-route Helmet already resolves `ogImage`; extend `useResolvedSeo` to auto-select the first `image_assets` row tagged as hero for the current record when no explicit OG image is set.
- `sitemap-images.xml` follows Google's `image:image` spec; referenced from `robots.txt` (`Sitemap:` line) and the SSR prerender output.

## 6. Admin — Image SEO Dashboard

New route `/admin/image-seo` with:
- Header stats: total images, SEO health score, AI-readiness score, broken, duplicates, missing alt, missing schema, missing sitemap.
- Filterable table of `image_assets` with per-row "Re-optimize" and "Edit metadata" actions.
- "Rescan entire library" button → enqueues `image-audit-crawler` + reprocesses all assets.
- Sidebar entry under SEO & AI Tools.

## 7. Rollout & validation

1. Migration: create tables, bucket, RLS, cron.
2. Deploy workers; run first full audit in a dry-run mode that only records issues.
3. Ship `<SmartImage>` + swap in shared components behind a feature flag `image_seo_enabled` in `site_settings`.
4. Flip flag on, monitor `image_optimization_jobs` and Core Web Vitals via existing `AdminWebsiteOptimizer`.
5. Final report: emit a Markdown report to `reports/image-seo-YYYY-MM-DD.md` (totals, fixes, remaining issues, rollback = flip flag off + revert component swap).

## Technical details

- Image processing runtime: Deno edge functions can't run native `sharp`. Two options — (a) `npm:@jsquash/webp` + `@jsquash/avif` + `@jsquash/resize` (pure WASM, works on Deno), or (b) run the worker as a Node-based Supabase edge function. Recommendation: `@jsquash/*` for portability; document fallback if AVIF times out.
- Hash-based dedupe stores each unique binary once; multiple `image_assets` rows can point at the same variant set.
- AI cost control: alt generation runs only when alt is missing/generic (heuristic list + duplicate detection). Cached forever after; regeneration only via admin action.
- Never rewrite URLs stored in `colleges.image_url`, `articles.thumbnail_url`, etc. — delivery layer picks variants at render time.
- Accessibility: decorative images (detected via zero-context, e.g. background decoration divs) get `alt=""`; content images always get meaningful alt.

## Open questions (will confirm before build)

1. Confirm target bucket name `image-derivatives` (private, served via signed short-lived URLs or made public — public is simpler; ask before enabling).
2. Confirm `<SmartImage>` should replace `<img>` in the specific components listed, or across all `src/**` (broader = riskier).
3. Alt-text language: English only, or mirror page locale where present.
