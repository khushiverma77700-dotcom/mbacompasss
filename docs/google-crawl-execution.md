# Google discovery and loading — 25 October 2026

## Search Console export

The supplied workbook contains Search performance, not Page indexing or Crawl stats. Its 92-day window (24 July–23 October) records 8,300 clicks and 1,957,730 impressions: CTR 0.424%, impression-weighted average position 10.01. Latest 28 days versus preceding 28: 1,609 versus 2,915 clicks and 408,019 versus 741,775 impressions, both down approximately 45%. CTR remained approximately 0.394% versus 0.393%; average position improved from 10.52 to 9.80. This does not establish an indexing failure or its cause. Pages and queries are capped exports, not complete inventories.

## Implemented and checked

- College/coaching next/previous anchors provide distinct twenty-record pages and page-specific canonical URLs and titles. Invalid unfiltered college pages return HTTP 404 rather than range errors.
- City/state loaders now filter public listing data before pagination; normalized location matching remains intact. Regional pages link subsequent pages and state pages retain city links.
- College interactive filters retain the complete catalogue, loaded on interaction rather than serialized into each unfiltered page. Filter changes reset pagination.
- College initial HTML now contains existing related colleges and four published article links; article queries fetch summaries rather than bodies.
- Account bootstrap installs existing image upload compression instead of public router startup; calculator parsing loads when used, and the main calculator heading is visible without awaiting animation.
- Public snapshot refresh skips fresh data and includes the new directory/related-link keys; old snapshots refresh once while private data stays excluded.
- Start Here is included in native public prerender selection. Googlebot/Bingbot presentation/tracking exclusions now align; page pagination is not blocked.
- Twenty-two focused tests passed. Desktop (1280×1800) and phone (390×844) checks verified next/previous, distinct results, real Ahmedabad search, regional/coaching/calculator layouts and no page errors or horizontal overflow.

## Page-size evidence

Live responses versus updated **development SSR**, fetched in the same session. Uncompressed HTML bytes, not transferred JavaScript or production bundle sizes:

| Page | Live bytes | Updated preview bytes | Interpretation |
|---|---:|---:|---|
| Colleges | 471,527 | 485,992 | Adds crawlable navigation; development assets differ |
| Bangalore colleges | 6,241,928 | 491,006 | Approximately 92% less HTML |
| Maharashtra colleges | 15,734,090 | 476,777 | Approximately 97% less HTML |
| IIM Ahmedabad | 436,774 | 543,658 | Adds reader-visible related cards/links; development assets differ |
| CAT calculator | 141,225 | 180,653 | Development output is not a bundle-size comparison |

Do not compare localhost response timings with production or claim Lighthouse/field targets have been achieved. Repeat live checks after publication; inspect bundle-report.json then. Existing type/exam hubs still use their full catalogue path and deserve a separate scoped-query pass with preserved predicates.

## Editorial priorities — no wording changed

1. Preserve traffic-bearing Welingkar placement article, Profile Analyzer and university pages; review evidence, year-specific placement claims and user intent before changes.
2. Audit GIM, Bennett and Nirma fee pages with high impressions and low sampled CTR: verified fee breakdown, programme/year distinctions and distinct useful summaries. Sample query rows cannot establish sitewide CTR causes.
3. Review Lucknow University, Jamia Millia and IRMA pages for helpful verified admission/fee answers and competing pages targeting the same intent.
4. Confirm author/reviewer details and calculator assumptions using supplied evidence; never invent facts or add unsupported ratings.

## Remaining dependencies

- Publish approved changes, then repeat live pagination, HTML, error, size and mobile lab checks. No publish was requested in this task.
- Upload Page indexing exclusions with example URLs and Crawl stats, or connect a verified Google property. Performance data cannot identify excluded-page reasons.
- `www.mbacompass.in/colleges` still returns HTTP 200. Canonicals already use the apex host; a permanent hosting-domain redirect remains outstanding. Preserve dashboard.mbacompass.in and primary mbacompass.in.
- Authorized signed-in access is needed for real student-dashboard performance checks. No private routes were cached, snapshotted or exposed.

Reference standards: Google's crawlable-link and pagination guidance, Search Essentials, canonical consolidation, sitemap limits and web.dev Core Web Vitals. Eligibility and these corrections never guarantee indexing or rankings.