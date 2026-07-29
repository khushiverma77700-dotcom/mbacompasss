# MBA Compass — Full SEO / GEO / AEO Overhaul Plan

Goal: raise organic + AI-Overview visibility for mbacompass.in without regressing existing SSR, sitemap, or Cloudflare pipelines. Work is phased so each step ships value and is independently verifiable.

---

## Phase 0 — Audit (read-only, no code)

Deliverable: an `reports/seo-audit-<date>.md` file summarising findings. Nothing else changes in this phase.

1. Trigger a fresh SEO scan (`seo--trigger_scan`) and read `seo--list_findings` + existing `reports/seo-metadata-audit.md`.
2. Crawl top templates via the SSR pipeline and record for each: `<title>`, meta description, canonical, `og:*`, `twitter:*`, H1, JSON-LD types, word count, internal-link count, image alt coverage, robots/index status.
   - Routes sampled: `/`, `/colleges`, `/college/:slug` (3 samples), `/coaching`, `/coaching/:slug`, `/exam/:slug`, `/article/:slug`, `/blog`, `/profile-analyzer`, `/college-shortlister`, `/iim-waitlist-movement`, `/freebies`, `/formulas`, `/formulas/:slug`, `/guides/ipmat-preparation`, category pages, city pages.
3. Cross-check `public/sitemap.xml` + `serve-sitemap` output vs actual routable pages; flag orphans and 404-prone legacy slugs.
4. Run Lighthouse mobile on 5 representative URLs; log LCP/CLS/INP + render-blocking JS/CSS.
5. Pull Semrush snapshot (`domain_analysis`, `top_pages`, `competitive_analysis`) for `mbacompass.in` to identify highest-opportunity clusters and keyword gaps.

## Phase 1 — Technical SEO Fixes

Highest-leverage, lowest-risk fixes first.

1. **Canonical hygiene**: audit every `useResolvedSeo`/`SEOHead` consumer for self-referencing canonical using `CANONICAL_HOST`. Kill any absolute canonicals that leak preview / www / lovable.app hosts. Confirm `og:url` matches canonical per route.
2. **Duplicate/singleton JSON-LD**: extend `useResolvedSeo` singleton dedupe list (already covers FAQPage/BreadcrumbList/WebPage/Organization) to also include `ItemList`, `CollectionPage`, `Course`, `EducationalOrganization` where currently over-emitted.
3. **Sitemap**: split into index + child sitemaps (`colleges`, `coaching`, `articles`, `exams`, `cities`, `categories`, `static`) via the existing `serve-sitemap` function; strip query-string URLs; drop synthetic `<lastmod>` values derived from build time (per sitemap-lastmod policy). Refresh `public/sitemap.xml` snapshot.
4. **robots.txt**: verify only one `Sitemap:` directive, matches active host, no accidental `Disallow: /admin` leaks of paths we do want crawled (none currently should be).
5. **Legacy redirects**: audit `LegacyCollegeSlugRedirect` + `CollegeProgrammeRedirect` coverage against GSC Soft-404 list; add missing patterns.
6. **Image SEO**: run `scripts/audit-seo-metadata.ts` extension to flag missing `alt`, non-descriptive alts, and non-lazy above-the-fold images. Fix top 20 offenders.
7. **Core Web Vitals**: preload LCP hero image on `/`, `/colleges`, `/college/:slug`; convert remaining PNG heroes to WebP via `imagetools`; audit `MBANewsBar` + newly-added home sections for CLS.

## Phase 2 — On-Page + Programmatic SEO

1. **Templates**: harden meta title/description templates for `CollegesPage`, `CoachingPage`, `CategoryPage`, `ExamDetailPage`, `CollegeHubPage`, `CityPage`. Enforce one primary keyword + one secondary per template, driven by existing `coachingSeoTemplates.ts` pattern. Extend that helper for the college side.
2. **Programmatic internal linking**: reuse `InternalLinksSection` pattern on college, coaching, category, exam, and city pages so every leaf page exposes 6–12 crawlable neighbour links (related exams / nearby cities / popular specialisations / top colleges by tier).
3. **Breadcrumbs**: ensure every leaf template renders visible breadcrumbs + `BreadcrumbList` JSON-LD.
4. **Content gaps** (from Phase 0 Semrush pull): draft brief for top 5 missing clusters (e.g. "IIM cutoffs 2026", "GMAT vs CAT", "MBA fees comparison") and stub programmatic pages where DB rows already support them.

## Phase 3 — GEO / AEO Content Upgrade

Optimise for ChatGPT / Gemini / Perplexity / Google AI Overview.

1. Add an `AeoAnswerBlock` component (short factual paragraph + entity list + stat table) used at the top of `/college/:slug`, `/exam/:slug`, `/article/:slug`, `/iim-waitlist-movement`, `/guides/*`.
2. Standardise FAQ generation: every leaf template renders 5–8 entity-anchored Q&As sourced from DB fields (fees, eligibility, cutoff, placements, ranking). Wire into existing FAQPage JSON-LD path in `useResolvedSeo`.
3. Add "Key facts" schema (`DefinedTerm` + `Table`) to guides + articles so AI engines can extract citations.
4. Update `public/llms.txt` with the refreshed sitemap sections and top canonical URLs per cluster.

## Phase 4 — Validation & Monitoring

1. Extend `scripts/audit-seo-metadata.ts` to enforce: single canonical, unique title, unique meta description, one H1, ≥3 internal links, ≥1 JSON-LD, valid OG image. Fail CI on regression.
2. Add a nightly `seo-health-check` run over the top 200 URLs (already scaffolded) and surface diffs on `/admin/seo-health-check`.
3. Re-run Lighthouse + Semrush snapshot and diff vs Phase 0 baseline; write `reports/seo-audit-after.md`.
4. Submit refreshed sitemaps to GSC + IndexNow (auto-run cron already exists).

---

## Files likely to change

- `src/lib/canonical.ts`, `src/lib/seoAutomation.ts`, `src/hooks/useResolvedSeo.ts`, `src/components/SEOHead.tsx` (canonical + JSON-LD singleton hardening)
- `src/lib/coachingSeoTemplates.ts` + new `collegeSeoTemplates.ts`, `examSeoTemplates.ts`
- Page templates: `CollegesPage`, `CoachingPage`, `CategoryPage`, `ExamDetailPage`, `CollegeHubPage`, `ArticlePage`, `BlogPage`, `CityPage`
- New: `src/components/seo/AeoAnswerBlock.tsx`, generic `RelatedLinksSection` (generalised from `InternalLinksSection`)
- `supabase/functions/serve-sitemap/index.ts` (split + lastmod policy)
- `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`
- `scripts/audit-seo-metadata.ts` (stricter checks), CI workflow
- `reports/seo-audit-*.md` (new)

## Risk & rollback

- Each phase is a separate PR/commit. Canonical + sitemap changes are reversible by reverting the two files above.
- SSR pipeline, Cloudflare worker, and existing indexing cron are untouched.
- No DB schema changes.

## Out of scope (ask before doing)

- Migrating stack to TanStack Start / SSR framework swap.
- Rewriting existing DB-backed content copy in bulk (would go through Re-SEO pipeline, not this plan).
- Changing admin UX beyond surfacing the new audit report.

---

Approve this and I'll start with **Phase 0 audit** — no code changes until findings are on the table.
