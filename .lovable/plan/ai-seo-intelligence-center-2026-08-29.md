# AI SEO Intelligence Center

A continuous, browser-independent SEO intelligence system under Admin → SEO & AI Tools at `/admin/seo-intelligence`. Built in two phases; each phase ships fully working, no mock data.

## What it is grounded in

| Data | Source | Label shown in UI |
| --- | --- | --- |
| Clicks, impressions, CTR, average position (page + query) | Google Search Console | ACTUAL |
| Indexing / coverage state per URL | Search Console URL Inspection | ACTUAL |
| Daily per-keyword rank, competitor ranks | Semrush Position Tracking (your campaigns) | ACTUAL |
| Search volume, CPC, difficulty, SERP competitors, gaps | Semrush | ESTIMATED (provider) |
| Page HTML, titles, headings, schema, competitor page structure | Firecrawl crawl | ACTUAL |
| SEO health score, opportunity score, improvement deltas | Our own formulas over the above | CALCULATED |
| Recommendations and "why" narratives | OpenAI (Vaibhav / Suyash keys) over the fact blocks above | AI |

Every stored metric carries value + source + type + date range + fetched_at. When a source is not configured or a call fails, the cell reads **DATA UNAVAILABLE** with a link to the API page. Nothing is ever invented or copied from another keyword.

**Required first step:** Search Console is not connected yet and its tables are empty, so no page/query/position data exists today. Phase 1 starts by connecting Google Search Console (a connect card will appear for you) and picking the verified property, then backfilling 16 months of page and query data. Semrush is already connected; Position Tracking needs at least one campaign in your Semrush account — the UI will tell you if none is found instead of guessing ranks.

## Phase 1 — Engine, data spine and core tabs

**Master Control Center** — Engine ON/OFF switch. ON starts scheduled monitoring; OFF stops workers, scans, recommendation and task generation while keeping all history. Header shows engine status, last successful scan, last API sync, next scheduled scan, active workers, connected/failed APIs, pending tasks, new recommendations, last report.

**Background engine** — every job is a queued row processed by bounded workers, driven by `pg_cron`, so closing the browser changes nothing:
- `seo-intel-scheduler` (every minute) — reads engine state and schedule window, enqueues due jobs, nothing else.
- `seo-intel-worker` — single-flight lease, small bounded batch per run, per-item idempotent progress, retry with backoff, halts on auth/quota errors and parks the job with the real provider error.
- Job types: `gsc_sync`, `rank_sync`, `crawl_page`, `keyword_metrics`, `competitor_scan`, `ai_analyze`, `verify_change`, `report_daily`, `report_weekly`.
- Every job row records id, type, start, end, status, source, records processed, errors, retry count.

**Monitoring Schedule** — Always Active, or a custom window (start/end time, days) with independent frequencies for monitoring, ranking, competitors, technical crawl and reports. Outside the window: "Monitoring Paused". Plus **Run Full Scan Now**.

**API & Data Sources** — one row per source (Search Console, Semrush, Semrush Position Tracking, Firecrawl, PageSpeed, OpenAI) with Connect → Test Connection → Active, last sync, next sync, usage/rate-limit state and the exact last error. Optional SERP/DataForSEO slots exist as configurable providers you can add later without code changes.

**Overview (Command Center)** — organic clicks, impressions, CTR, average position, indexed pages, ranking keywords, keywords gained/lost, pages improved/declined, new opportunities, critical issues, pending actions. Interactive charts for rankings, traffic, impressions, CTR, keyword growth, page performance over 24h / 7d / 30d / 90d / custom, each with a data-freshness stamp and a stale warning when the last sync is old.

**Live Monitor** — real job and event stream from the activity log (timestamped, e.g. "Search Console synchronized — 1,284 pages"), auto-refreshing while jobs run. No synthetic events.

**Pages** — an SEO profile per URL: current/previous position and change, target keywords, volume, impressions, clicks, CTR, indexed status, competitor position, health score, title, description, schema, content status, internal links, last crawl, last update. Filter by type (college / MBA college / course / exam / blog / landing), category, URL, keyword, ranking band, status, priority, date.

**Keywords** — previous → current → change per keyword, with volume, impressions, clicks, CTR, competition, trend, target page, competitors, over 24h/7d/30d/90d where data exists.

**AI Recommendations** — each row carries page, problem, evidence (the actual numbers used), why it matters, recommended change, expected impact, confidence, priority, data source, created at, status. Hedged language enforced; no rank guarantees. Before/After diff with Edit → Approve → Apply. **Per your choice nothing is applied without your approval** — approved changes write through the existing SEO override/apply path and are logged.

**SEO Tasks** — task id, page, college, keyword, issue, recommendation, priority, created, due, status, assignee, source, before, after, verification result. Flow: New → Review → Approved → In Progress → Applied → Submitted → Waiting for Verification → Completed, plus Rejected / Failed / Reopened. Tasks are created by the engine automatically, including "pending from your side" items.

**Activity Log / Audit** — every scan, sync, approval, applied change, before/after and verification result, with actor and timestamp.

## Phase 2 — Outcome intelligence

- **What Improved** — pages/keywords gaining rank, entries into top 100/20/10/5/3, traffic, CTR and impression gains, newly ranking keywords, all from stored history.
- **What Did Not Improve** — applied recommendations with no measurable movement, stagnant and declining pages/keywords, unresolved technical issues, plus an AI "why not" analysis and a fresh recommendation.
- **Pending From My Side** — auto-detected human actions (approval, content review, publish, GSC submission, verification, manual technical change).
- **Competitor Intelligence** — competitors detected from your target-keyword SERPs; tracked ranks, titles, descriptions, headings, structure, keyword coverage, FAQs, schema, freshness, SERP features and content gaps; "Why are they outranking us?" and "What should we change?" grounded in crawled evidence.
- **Google Console Tasks** — auto-created indexing/verification tasks with Mark Submitted, then Waiting for Verification → Verified using URL Inspection evidence only. Never claims indexing without confirmation.
- **SEO Experiments** — each applied change becomes an experiment with before/after position, change date and observed impact; outcomes feed back into recommendation scoring.
- **Reports** — automatic daily and weekly reports covering the full checklist, stored and viewable in-app.
- **Notifications** — rank drops/gains, new or overtaking competitor, critical issues, high-impact recommendations, approvals needed, console task pending, API failure, monitoring stopped, stale data.

## Technical notes

New tables (RLS + GRANTs, admin-only read/write, service_role for workers): `seo_intel_settings`, `seo_intel_schedule`, `seo_intel_sources`, `seo_intel_jobs`, `seo_intel_activity`, `seo_intel_pages`, `seo_intel_page_history`, `seo_intel_keywords`, `seo_intel_rank_history`, `seo_intel_competitors`, `seo_intel_competitor_history`, `seo_intel_recommendations`, `seo_intel_tasks`, `seo_intel_console_tasks`, `seo_intel_experiments`, `seo_intel_reports`, `seo_intel_notifications`, `seo_intel_audit`. Existing `gsc_page_metrics`, `gsc_query_metrics`, `keyword_metrics_cache`, `page_seo_overrides`, `seo_reoptimization_*` and `pruning_pages` are reused, not duplicated.

New edge functions: `seo-intel-scheduler`, `seo-intel-worker`, `seo-intel-api` (dashboard reads/actions), `seo-intel-apply`, `seo-intel-report`. Existing `gsc-ingest`, `gsc-index-check`, `keyword-metrics`, `silo-*`, `pruning-*`, `seo-auto-fix` are wired in as job handlers rather than rewritten. All admin-guarded; credentials stay server-side in secrets/connector gateway and are never logged or sent to the browser. Shared filter/table components so filtering is implemented once. Cron: scheduler every minute, worker pump every minute, daily report, weekly report.
