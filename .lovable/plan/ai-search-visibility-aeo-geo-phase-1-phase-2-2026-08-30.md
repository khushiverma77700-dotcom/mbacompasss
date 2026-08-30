# AI Search Visibility (AEO/GEO) — Phase 1 + Phase 2

Goal: make every public page easy for AI search engines (ChatGPT, Perplexity, Gemini, AI Overviews) to extract, verify and cite — without touching the current design, business logic or URLs.

## What already exists (verified)

- `SEOHead` handles title/description/canonical/OG/Twitter/robots on ~40 public pages, forces the apex host, and noindexes filtered URLs.
- `robots.txt` already allows GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Applebot, CCBot, Google-Extended, and lists both sitemaps.
- SSR prerender + dynamic sitemaps are live; AI content already runs through `_shared/aiContentRules.ts` (banned buzzwords, fact guardrails).

## What is actually weak (the gap to fix)

1. **Structured data is inconsistent.** Exams have FAQPage, colleges have College + FAQ, but Articles/Blog have no BreadcrumbList, coaching/course/listing pages skip Article/Course/Breadcrumb combinations, and several pages emit no schema at all. No sitewide Organization/WebSite graph with `@id` entity links.
2. **No answer-first block.** Pages open with prose, not a direct extractable answer. AI engines need the answer in the first ~60 words.
3. **Trust/E-E-A-T signals are visual only.** Author name is rendered as text but not as `Person` schema; published/updated dates are not machine-readable everywhere.
4. **Facts are not marked up.** Fees, dates, eligibility, cutoffs sit in prose or divs instead of semantic tables/definition lists that AI can lift.
5. **Semantic HTML / heading hierarchy** drifts on generated content (multiple H1s, H3 before H2, `div` where `article`/`section` belongs).
6. **Internal linking** between article → exam → college → coaching clusters is thin, so entity relationships are unclear.

---

## Phase 1 — Frontend AEO/GEO layer on all public pages

Design stays exactly as it is. This phase adds structure, schema and small text blocks only.

### 1. Shared entity + schema library

Extend `src/lib/` with one schema builder module used by every page type:

- Sitewide `Organization` + `WebSite` graph with stable `@id`s (`https://mbacompass.in/#organization`), publisher, logo, sameAs, and `WebSite.publisher` pointing at the org `@id`.
- Per-page builders: `WebPage`, `BreadcrumbList`, `Article`/`BlogPosting` (with `author` as `Person`, `datePublished`, `dateModified`, `publisher` `@id`), `Course`, `EducationalOrganization` / `CollegeOrUniversity`, `LocalBusiness` for coaching centres with real addresses, `FAQPage`, `ItemList` for listing pages, and `speakable` on the answer block.
- One dedupe/validate pass so no page ships two conflicting FAQPage or Article blocks. No ratings/reviews unless real data backs them.

### 2. Answer-first block ("Key Answer" summary)

A small reusable component rendered directly under the H1 on article, exam, college, coaching, course and hub pages:

- 40–60 word direct answer to the page's primary question, built from existing content (summary field, first paragraph, or key facts) — no new AI calls in Phase 1.
- 3–6 "Key facts" as a semantic `<dl>` (fees, dates, eligibility, mode, location as available).
- Marked with `speakable` in schema so answer engines can lift it.

### 3. Fact tables and extractability

- Route fee/date/eligibility/cutoff/comparison data through the existing responsive-table pattern (`useScrollableTables`) as real `<table>` with `<caption>` and `<th scope>`.
- Add `<time datetime>` for published/updated dates and a visible "Last updated" line on content pages.

### 4. Semantic HTML + heading normalisation

- Wrap main content in `<main>` → `<article>`/`<section>`, use `<figure>/<figcaption>` for captioned images, `<aside>` for sidebars.
- A rendering-time sanitiser for stored HTML that demotes extra H1s to H2 and repairs skipped heading levels, so admin-generated content can't break hierarchy.

### 5. Breadcrumbs + internal linking everywhere

- `SiteBreadcrumbs` (already exists) on every detail page, always paired with `BreadcrumbList` schema.
- A "Related" block per page type driven by existing data: article → its exam/college entities, exam → colleges accepting it + coaching for it, college → its exams and comparisons, coaching → its courses and city hub. Descriptive anchor text, capped at 6 links.

### 6. Trust pages linked from every page footer

Author box on articles linking to the existing author page, plus footer links to About / Editorial Policy / Fact-check / Contact so E-E-A-T signals are one click from any page.

### 7. Hygiene sweep

Alt text audit on meaningful images, `loading="lazy"` + `decoding="async"` below the fold, remove any remaining placeholder/"TBA;" artefacts, and verify no page regressed via a route-level check of title/H1/canonical/schema.

Page types covered: Blogs & Articles (`BlogPage`, `ArticlePage`, `CategoryPage`, `AuthorsPage`, `AuthorDetailPage`), Coaching (`CoachingPage`, `CoachingFilterPage`, `InstitutePage`, `InstituteCoursePage`), Colleges (`CollegesPage`, `CollegeDetailPage`, `CollegeHubPage`, `CollegeFilterPage`, compare), Exams (`ExamsListingPage`, `ExamDetailPage`), Courses/Mocks (`MBACompassCourses*`, `MocksListPage`), Tools (`ProfileAnalyzer`, calculators, shortlister, freebies), and static/policy pages.

---

## Phase 2 — Make the AI SEO engine enforce this standard

### 1. One canonical rulebook

Turn the master prompt into a single shared module (`_shared/aeoGeoRules.ts`) alongside the existing `aiContentRules.ts`, covering: answer-first structure, question-shaped H2s, direct answer then explanation, dated and sourced claims, facts as tables, entity consistency, schema-matches-content, no fabricated credentials, one primary keyword per page.

Import it into **every** generator: `ai-blog-writer`, `ai-exam-writer`, `ai-college-writer`, `ai-college-section`, `ai-institute-writer`, `ai-course-writer`, `ai-coaching-institute-generate`, `ai-edit-content`, `ai-expand-content`, `generate-news`, `refresh-content`. From then on all new AI content complies by construction.

### 2. AEO/GEO compliance scorer

A deterministic checker (no AI cost) run on generated and existing HTML, scoring: answer-first present, question H2s, direct answers, `<table>` for comparative data, dated claims, source citations, heading validity, internal links, entity mentions, schema/content match, keyword density band. Returns a 0–100 score plus itemised gaps — same shape the existing Re-SEO/audit panels already consume.

### 3. Engine upgrade (approval-gated rewrites)

- `ai-seo-enhance`, `seo-intel-worker`, the Re-SEO workers and `full-page-seo-audit` all call the scorer, store the score on the page row, and rank low scores as the next best action.
- When a page fails, the worker generates a **draft** rewrite plus a diff and files it in the existing `approval_queue`. Nothing publishes until you approve — matching your choice. Metadata and schema fixes stay in the same queue for a single review surface.
- Rotational coverage already added to `seo_intel_pages` keeps cycling all ~4,400 pages through the new scorer, newest pages first.

### 4. Admin visibility

Add an "AEO/GEO Compliance" card to the AI SEO Intelligence Center: site-wide average score, distribution, worst offenders, pending rewrite approvals, and score trend — reusing the existing live-animated components, no new dashboard.

---

## Technical notes

- No new dependencies. New code is a few `src/lib` modules, 2–3 small shared components, one shared Deno module, and edits to existing page/worker files.
- No URL, route, auth, payment, mock-engine or database-schema changes beyond two nullable score columns on the SEO page inventory.
- Verification: build check, spot-check prerendered HTML for representative article/exam/college/coaching URLs to confirm the answer block and schema are in the initial HTML response, and validate the JSON-LD graph.

## Sequence

Phase 1: schema library → answer-first block + fact tables → semantic/heading + breadcrumbs/related links → hygiene sweep → verification.
Phase 2: rulebook module → scorer → generator + worker wiring with approval-queue drafts → admin compliance card.
