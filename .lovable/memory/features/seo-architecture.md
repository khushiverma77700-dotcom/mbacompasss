---
name: seo-architecture
description: Sitemap delivery, canonical strategy, brand naming, and auto-indexing wiring for the BSchoolBuzz site
type: feature
---
- Sitemap: live auto-generated at https://mttoiqruzzxooveooldo.supabase.co/functions/v1/serve-sitemap (edge function `serve-sitemap`). A static sitemapindex at `public/sitemap.xml` references it so `https://bschoolbuzz.com/sitemap.xml` returns 200 (Lovable hosting does NOT process `public/_redirects` — that file was removed).
- robots.txt declares BOTH sitemap URLs.
- Sitemap excludes query-parameter URLs (no more `?fee=`, `?specialization=`) — they self-canonicalize on the page.
- Canonicals: CollegesPage / CoachingPage / CategoryPage emit a self-canonical based on `window.location` (path + query) so filtered URLs canonicalize to themselves.
- Brand: single brand "BSchoolBuzz" everywhere. `index.html`, `SEOHead.tsx` (og:site_name + all schema generators), CategoryPage meta titles all use BSchoolBuzz. Old "Best MBA Coaching" / "MBAHub" strings in code are deprecated.
- Auto-indexing: `submitToGoogleIndexing(...)` from `src/lib/googleIndexing.ts` is now called inside admin save handlers for AdminArticles (only when published=true), AdminColleges, AdminInstitutes, AdminExams — fires Google Indexing API + IndexNow + sitemap ping.
- AdminSitemap "Generate & Save" still saves to `site_settings.sitemap_xml` for snapshot/download but the live sitemap is always served fresh from the edge function.
