
# SEO Audit & Fix Plan — mbacompass.in

Your prompt covers ~30 distinct workstreams across 200+ files. Trying to do it all in one shot guarantees regressions, blown context, and unverifiable changes. I'll do it as 4 focused passes — each is reviewable, deployable, and builds on the last. Tell me which to start with (or say "all, in order") and I'll execute.

## Current state (already in place from prior work)

- Prerender pipeline (`scripts/prerender-seo.ts`) + Cloudflare Worker bot-routing (`cloudflare/worker.js`) → Googlebot gets fully-rendered HTML.
- Per-route `<Helmet>` via `useResolvedSeo` + `seoAutomation` (DB-driven titles/descriptions/canonicals/JSON-LD).
- `public/robots.txt` clean, sitemap referenced, admin/auth disallowed.
- Sitemap kept fresh by admin + 6h cron.
- CWV: CLS audit complete, LazyMount + font-display fallbacks, dashboard auth cold-start fixed.

So the foundations are solid. What's left is **enforcement, dedupe, and gap-filling**.

## Pass 1 — Metadata correctness (Critical/High)

Goal: every public route ships a unique, length-correct title + description + self-referencing canonical in source HTML.

- Add a validator script `scripts/audit-seo-metadata.ts` that:
  - Crawls sitemap, fetches each URL with `?_prerender=1`, parses `<head>`.
  - Reports: missing/duplicate titles, missing/duplicate descriptions, title <50 or >60 chars, description <150 or >160 chars, missing/wrong canonical, canonical loops, missing OG, missing JSON-LD.
  - Writes `reports/seo-metadata-audit.json` + a markdown summary.
- Fix the top offenders surfaced by the report (template-level fixes in `seoAutomation.ts` defaults + per-route Helmet where DB rows are blank).
- Enforce length bounds at write time in `AdminBulkSEO` / `AdminMetaValidator` (already partly there — wire warnings into save flow).

## Pass 2 — Structured data & E-E-A-T (High)

- Sitewide `Organization` + `WebSite` (with `SearchAction`) JSON-LD in `index.html`.
- `BreadcrumbList` on every detail page (College, Article, Exam, Institute, Coaching, Course).
- `Article` schema on `ArticlePage` with `author` (Person), `publisher` (Organization w/ logo), `datePublished`, `dateModified`, `image` (≥1200×630).
- `CollegeOrUniversity` / `EducationalOrganization` schema on college pages.
- `Course` schema on MBA Compass courses.
- `FAQPage` only when FAQs actually exist (dedupe already handled in `useResolvedSeo`).
- Add `author` pages (`/author/[slug]`) with `Person` schema — needed for E-E-A-T + Discover eligibility.

## Pass 3 — Indexing, crawlability, internal linking (High/Medium)

- Sitemap split: index file + per-type sub-sitemaps (colleges, articles, exams, institutes, coaching, courses, static) — already partly done; verify gzipped & <50k URLs each.
- `lastmod` from real `updated_at`, not build time.
- `hreflang="en-IN"` + `x-default` on canonical pages.
- Internal-link audit: every detail page links to ≥3 related pages; category hubs link to children; orphan-page detector script.
- `robots.txt`: add `Disallow: /*?utm_*`, `/*?fbclid=`, `/*?gclid=` to avoid param-duplicate indexing.
- 404 vs soft-404: ensure `NotFound.tsx` sets `<meta name="robots" content="noindex">` and prerender writes 404 status.

## Pass 4 — GEO / AI Search & Discover (Medium)

- `public/llms.txt` exists — refresh with current top pages + descriptions.
- `Speakable` schema on news/article pages (Discover signal).
- `NewsArticle` schema on `NewsSection`/Newsroom items with `dateline` (Discover eligibility).
- AI-citation friendliness:
  - Add "Last updated" + "Reviewed by {author}" visible on Article/College pages (E-E-A-T).
  - Add "Key takeaways" / TL;DR block to articles (renders as `Speakable` selector).
  - Add `<meta name="article:author">`, `<meta name="article:published_time">`, `<meta name="article:modified_time">` (Helmet).
- Open Graph image fallback per content type (already partly there) — ensure all ≥1200×630.
- Verify Bingbot, GPTBot, PerplexityBot, Google-Extended in `robots.txt` (opt-in for AI training/citation).

## Deliverables per pass

1. List of files modified + diff summary.
2. The audit report JSON/MD (Pass 1).
3. Before/after sample for 3 routes (homepage, an article, a college).
4. What's deferred to the next pass.

## Tell me how to proceed

Reply with one of:
- **"Pass 1"** — start with the metadata audit + fixes (recommended first).
- **"All, in order"** — I'll do Pass 1 fully, report, then continue. Each pass ends with a checkpoint so you can review before the next.
- **"Skip to Pass N"** — if you've already handled the earlier passes elsewhere.
- **Custom scope** — e.g. "just structured data on article + college pages".
