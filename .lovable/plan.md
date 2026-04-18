
## Goal
Upgrade the existing AI SEO Dashboard into a fully optimized, AI-search-ready system. **No rebuild** — only enhance the gaps in current modules.

## Current State Audit (what already exists)

✅ **Already in place:**
- AI keyword research with primary/longTail/shortTail/trending/faq buckets (`ai-keyword-research`)
- Bulk meta optimization, uniqueness check, full audit, auto-keywords (`auto-seo-engine`)
- Schema generation per content type (`ai-seo-enhance`)
- SEO snapshots stored in `site_settings`
- PageSpeed monitoring (`page-speed-check`)
- Internal link suggestions + apply flow
- Per-page rendering of keywords + internal links (`PageKeywords`)
- Resolved SEO via `useResolvedSeo` (titles, descriptions, canonical, JSON-LD, OG/Twitter)
- Google Indexing automation + nightly cron
- Sitemap fresh-from-DB serving

❌ **Gaps to fill:**
1. No **primary keyword field** per page (1 page = 1 primary KW rule not enforced)
2. No **funnel stage** tagging (TOFU/MOFU/BOFU) or **topic clusters** (pillar/cluster)
3. No **content scoring** for E-E-A-T, word count, paragraph length, FAQ presence
4. No **content freshness alerts** (90-day refresh cycle)
5. **Title rules** (55-60 chars, primary KW first, year, power words) not validated
6. **Meta description**: hard 150-char cap + CTA + duplicate detector not enforced
7. **Keyword placement validator** (H1, URL, first 100 words, H2/H3, ALT) missing
8. **Image audit** (WebP/AVIF, <80KB, ALT presence, count ≥4) not exposed in dashboard
9. **FAQ auto-generator** + auto-injection of FAQ schema per page missing
10. No **broken link / orphan page** detector
11. No unified **SEO Health Dashboard** view aggregating all KPIs

## Plan (incremental upgrade — no rebuild)

### Phase 1 — Schema additions (DB)
Add to `articles`, `colleges`, `institutes`, `exams`, `city_pages`:
- `primary_keyword TEXT`
- `funnel_stage TEXT` (tofu/mofu/bofu)
- `cluster_id UUID` (nullable, references new `topic_clusters` table)
- `last_seo_refresh TIMESTAMPTZ`
- `content_score INTEGER` (0-100, cached)

New table: `topic_clusters (id, name, pillar_page_type, pillar_record_id, primary_keyword, created_at)`

### Phase 2 — Validators & scorers (`src/lib/seoValidators.ts`)
Pure functions that return pass/warn/fail + fix suggestion:
- `validateTitle()` — 55-60 chars, primary KW at start, year, power-word check
- `validateMetaDescription()` — ≤150 chars, has CTA verb, has primary KW
- `validateUrl()` — hyphens, no stop words, no numbers, length
- `validateKeywordPlacement()` — H1, URL, first 100 words, H2/H3, ALT tags, density
- `scoreContent()` — word count, avg paragraph length, FAQ present, stats/numbers, headings hierarchy → 0-100
- `scoreEEAT()` — author present, dates, citations, internal links, schema → 0-100
- `auditImages(html)` — count, ALT %, format, estimated size
- `isStale(updated_at)` — >90 days flag

### Phase 3 — Edge function upgrades
**Extend `auto-seo-engine`** with new modes (no new function):
- `mode: "content_score"` — runs scorers, updates `content_score` + `last_seo_refresh`
- `mode: "faq_generate"` — AI generates 5-8 FAQs from content, saves into snapshot + injects FAQ schema
- `mode: "broken_links_scan"` — crawls internal links, reports 404s
- `mode: "orphan_pages"` — finds pages with 0 inbound internal links
- `mode: "stale_content"` — returns pages >90 days unrefreshed

**Extend `ai-keyword-research`** with:
- `mode: "cluster_map"` — given a pillar topic, returns cluster page suggestions + funnel stage per keyword
- `mode: "conversational_queries"` — generates AI-search-style natural language queries

### Phase 4 — Dashboard enhancements (`AdminSEODashboard.tsx`)
Add new tabs to existing sidebar (don't replace):
- **SEO Health** (overview): KPI cards — % pages with primary KW, avg content score, % with FAQ, % stale, broken links count, avg PSI score
- **Topic Clusters**: visual pillar→cluster map, assign pages to clusters
- **Content Freshness**: list pages >90 days, one-click "Refresh with AI"
- **Image Audit**: per-page image health (format, size, ALT)
- **Broken Links & Orphans**: scan results + fix actions

Enhance **All Pages** table:
- New columns: Primary KW, Funnel, Cluster, Content Score, Freshness, Image Health
- Inline validation badges (title length, meta length, KW placement)

### Phase 5 — Per-page output (`PageKeywords.tsx` + `useResolvedSeo`)
- Auto-inject FAQ schema (`@type: FAQPage`) when snapshot has FAQs
- Render FAQ section on article/college/institute/exam pages from snapshot
- Auto-inject Breadcrumb schema (already partial — make universal)
- Image schema for hero/banner

### Phase 6 — Admin UX in editors
In `AdminArticles`, `AdminColleges`, `AdminInstitutes`, `AdminExams`, `AdminCityPages`:
- Add **Primary Keyword** input + **Funnel Stage** selector + **Cluster** selector in SEO tab
- Live validation chips (title 55-60, meta ≤150, KW placement) using validators
- "Generate FAQs" button
- Show content score + E-E-A-T score with breakdown

### Phase 7 — Automation hooks
- Extend nightly cron (already running 12 AM-1 AM): add content scoring, stale-content scan, broken-links scan, image audit
- On article/college save: auto-run title + meta validators, set `last_seo_refresh = now()`

## Technical Notes
- **No new edge functions** — extend `auto-seo-engine` and `ai-keyword-research` with new `mode` branches to keep architecture flat
- All AI calls use Lovable AI Gateway (`google/gemini-2.5-flash` for cheap scorers, `google/gemini-2.5-pro` for FAQ/cluster generation)
- Validators are pure TS — run client-side in admin editors AND server-side in edge functions
- Reuse existing `site_settings` snapshot pattern for new data (faqs, image audit, content score detail)
- Indexing system + sitemap untouched — confirmed isolated

## Out of Scope (explicitly)
- No rewrite of `AdminSEODashboard.tsx` structure — additive tabs only
- No change to existing snapshot key format
- Image compression/conversion to WebP-AVIF: report-only first; actual conversion deferred (would require storage rewrites — flag as Phase 8 if requested)
- Ahrefs/GSC API search-volume integration: stub with `gsc_volume` field — actual GSC sync requires user OAuth (flag as Phase 8)

## Deliverables
1 migration (schema + topic_clusters table), 1 new file (`seoValidators.ts`), edits to 2 edge functions, edits to `AdminSEODashboard.tsx` + 5 admin editor pages, edits to `PageKeywords.tsx` + `useResolvedSeo.ts`.

Estimated 7-9 sequential implementation steps after approval.
