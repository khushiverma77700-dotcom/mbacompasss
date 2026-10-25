# Make MBA Compass easier to discover and faster to use

## What the review found

This is a targeted improvement plan, not a rebuild. No website content, URLs or SEO settings have been changed during this review.

**The website is already visible in search.** Semrush’s India snapshot estimates 8,605 ranking keywords and 2,757 monthly organic visits. Examples include position 1 for “ibs hyderabad mba average package” and position 3 for “masters’ union mba fees”. These are third-party estimates, not your measured Google traffic or an index inventory.

**We cannot yet confirm that most pages are uncrawled.** Khushi’s available Search Console account returned no properties. You offered to upload exports: Page indexing, Crawl stats and Search results will establish which pages Google discovered, indexed, excluded or ranked.

### Confirmed findings on the published website

| Finding | Evidence | Priority |
|---|---|---|
| College and coaching directories stop exposing links after the first 20 records | “Load more” changes the screen without providing a next-page URL; `?page=2` repeats the first page | First |
| Some regional pages send unnecessary catalogue data | Bangalore college page returned approximately 6.2 MB of uncompressed HTML | First |
| Phone loading is slow on important page types | In a fresh-browser test with simulated slower mobile network/CPU, largest-content timings were approximately 7.6s for IIM Ahmedabad, 5.1s for a long article and 8.3s for the CAT calculator | First |
| Initial downloads contain substantial scripts | Homepage approximately 558 KiB of transferred JavaScript; CAT calculator approximately 626 KiB, before interaction | First |
| Contextual discovery can be improved | IIM Ahmedabad’s initial HTML has no related college/article links, although related sections exist after loading | Next |
| Duplicate-host and crawler-rule consistency needs attention | `www` returns 200 with an apex canonical rather than an HTTP redirect; Googlebot rules omit several exclusions declared only for other bots | Next |

These are observed obstacles and opportunities—not proof of why Google excluded any particular page. The mobile timings are individual laboratory observations, not field Core Web Vitals or a fresh Lighthouse score.

### What is already working

- Representative homepage, college, coaching institute, exam, tool, application and article pages return substantive HTML without running JavaScript, with headings, descriptions and primary-domain canonical tags.
- The live sitemap index and all eight parts load successfully: **7,501 unique public URLs** in this audit. Private dashboards, authentication pages and query-string variants are excluded.
- Tested legacy URLs redirect permanently; an unknown college returns a real 404.
- The current foundation scan passes rendering, homepage metadata and favicon checks. Its two domain warnings compare against the Lovable hosting address, not your chosen primary domain. **Do not switch canonical URLs or sitemaps away from mbacompass.in to satisfy those warnings.**

## Phase 1 — Confirm Google’s actual exclusions

1. Read your uploaded Page indexing and Crawl stats exports, including example URLs for each exclusion reason; use Search results exports to compare page/query performance.
2. Group examples by college, institute, exam, article, tool and regional pages. Distinguish “discovered but not indexed”, “crawled but not indexed”, duplicates, redirects, errors and intentional exclusions.
3. Cross-check representative excluded pages against published HTML, canonical targets and sitemap membership. Read indexed URL Inspection results only when a verified matching property is accessible.
4. Create a dated baseline: known indexable inventory, Google’s reported indexed/excluded counts, crawl failures, impressions, clicks and page-type speed results. Missing Google data stays labelled unknown.

**Dependency:** your exports or a Google account with verified access to mbacompass.in. The independently confirmed technical fixes below need not wait for that access.

## Phase 2 — Repair discovery without changing established URLs

- Add genuine linked pagination to college and coaching directories, including server-readable result slices, next/previous links and bookmarked page URLs. Keep a convenient visitor experience without relying on button clicks for discovery.
- Give each real pagination page its own URL and self-referencing canonical. Keep sorting/search/tracking variants consolidated appropriately; do not canonicalize every distinct result page to page one.
- Use existing college → region → exam/course relationships to provide small, relevant contextual links in initial HTML. Avoid linking every page to every other page.
- Keep `/college/:slug`, `/institute/:slug`, `/exam/*`, `/tools/*` and genuine regional hubs. Preserve working permanent aliases and the real 404.
- Consolidate `www` to the primary host with permanent redirects where hosting supports it. Check host behaviour before changing it.
- Align crawler-specific rules deliberately, without blocking genuine pagination, public content or required assets. Keep private authentication and authorization unchanged.

**Acceptance:** every public directory record can be reached through real HTML links across bounded result pages; page two has distinct records; no new duplicate-host or broken-redirect paths.

## Phase 3 — Reduce first-visit loading work

- Replace full-catalogue regional reads with slim, location-filtered and paginated reads. Serialize only the data required by that page.
- Reduce unnecessary first-load scripts in the shared shell and CAT calculator. Load charts, exports, editor tools and nonessential enhancements only where and when needed; retain main content in initial HTML.
- Audit college/article cover images for appropriate mobile sizes, supported formats, stable dimensions and correct preload priority. Keep below-the-fold media lazy.
- Preserve existing font optimization and deferred analytics/advertising; check for redundant preloads, duplicate requests and expensive repeated rendering.
- Measure intermittent slow server responses and content freshness. Retain safe anonymous HTML caching and prebuilt pages, without caching private data or indefinitely serving old public facts.
- Add page-type payload budgets and regression checks. Investigate signed-in student performance separately when an authorized test session is available; signed-out timing is not dashboard verification.

**Targets:** field LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 at the 75th percentile, separately for mobile/desktop. Target mobile Lighthouse Performance and SEO ≥90 under a repeatable configuration. Report actual results; never promise every first visitor a one-second load.

## Phase 4 — Improve ranking value, with editorial approval

- Start with pages already earning impressions/traffic and high-value tools, rather than mass-producing more pages.
- Audit representative regional, college and article pages for distinct usefulness, verified current facts, duplicate passages and competing pages targeting the same intent.
- Propose specific improvements: clear answers, transparent calculator assumptions, sourced college metrics, named author/reviewer information where supplied, and useful comparisons/contextual links.
- Review thin or overlapping pages individually. Do not delete, redirect, unpublish or change article wording/SEO automatically; provide an approval list with reasons and preserve valuable existing rankings.
- Validate relevant structured data against visible facts and remove only unsupported/conflicting markup through approved corrections. Adding every schema type is not a ranking strategy; FAQ rich results are not generally available to MBA sites.

**Acceptance:** an editor-approved quality checklist and prioritized page list; no invented statistics, keyword stuffing, unreviewed AI publication or indiscriminate location-page expansion.

## Phase 5 — Publish, verify and monitor

- After approved implementation, publish once the checks pass, then repeat the same live URL/status/HTML/pagination and phone/desktop speed tests.
- Provide a before/after report separating transferred bytes, uncompressed HTML, laboratory timing and Google field data.
- Keep sitemap timestamps tied to significant page-specific changes; submit the sitemap only when it changes, not daily as an indexing ritual.
- Review weekly Google crawl/indexing trends and monthly query/page performance against the dated baseline. Track failures and improvements, not a guaranteed ranking position.

## Technical approach

Preserve TanStack Start route heads, native SSR/prerendering, publicPaths normalization, the createRequire guard and the full-inventory sitemap generator. Main implementation areas: directory route loaders/pages and shared listing queries; regional hub loaders; related-link prefetch; shared shell/calculator loading; server-cache diagnostics; crawl/metadata validation tests. Use small reusable query/pagination helpers and concrete regression tests rather than a new rendering framework or whole-site redesign.

## Google references

- [Minimum technical requirements](https://developers.google.com/search/docs/essentials/technical): access, successful responses and indexable content establish eligibility, not guaranteed indexing.
- [Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and [pagination guidance](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).
- [Canonical consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): Google's limit is 50,000 URLs/50 MB per file; this project's smaller eight-part structure is valid.
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): universal static rendering is not mandatory.
- [Core Web Vitals](https://web.dev/articles/vitals) and [people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- [Structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

## Scope and decision

Approve this plan to implement the confirmed discovery and loading corrections first. Google-specific exclusion diagnoses will be refined after your exports arrive. No redesign, mass content rewrite, domain switch or automatic publication is included.