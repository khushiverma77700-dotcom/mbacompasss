---
name: seo-architecture
description: Sitemap delivery, canonical strategy, brand naming, and auto-indexing wiring for the BSchoolBuzz site
type: feature
---
- Sitemap: `public/sitemap.xml` must contain the full same-domain `<urlset>` for `https://mbacompass.in/sitemap.xml`; do NOT publish a sitemapindex pointing to the backend function because Google Search Console may only discover the old/stale subset. The `serve-sitemap` backend function remains the generator source for refreshing the static file.
- robots.txt declares BOTH sitemap URLs.
- Sitemap excludes query-parameter URLs (no more `?fee=`, `?specialization=`) — they self-canonicalize on the page.
- Canonicals: CollegesPage / CoachingPage / CategoryPage emit a self-canonical based on `window.location` (path + query) so filtered URLs canonicalize to themselves.
- Brand: single brand "BSchoolBuzz" everywhere. `index.html`, `SEOHead.tsx` (og:site_name + all schema generators), CategoryPage meta titles all use BSchoolBuzz. Old "Best MBA Coaching" / "MBAHub" strings in code are deprecated.
- Auto-indexing: `submitToGoogleIndexing(...)` from `src/lib/googleIndexing.ts` is now called inside admin save handlers for AdminArticles (only when published=true), AdminColleges, AdminInstitutes, AdminExams — fires Google Indexing API + IndexNow + sitemap ping.
- AdminSitemap "Generate & Save" still saves to `site_settings.sitemap_xml` for snapshot/download but the live sitemap is always served fresh from the edge function.
