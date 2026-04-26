---
name: google-indexing
description: Fully automated Google + IndexNow indexing pipeline with sitemap discovery, DB triggers, and quota-aware hourly auto_run + 5-min auto_flush crons. Admin dashboard at /admin/google-indexing.
type: feature
---
- **DB triggers** (`enqueue_indexing_url()` + per-table AFTER INSERT/UPDATE) auto-queue URLs into `indexing_urls` for: articles (published only), colleges, institutes, exams, city_pages (active only), categories.
- **Sitemap discovery**: the `discover` action now ALSO fetches `https://mbacompass.in/sitemap.xml`, parses every `<loc>`, and bulk-upserts any URL not already in the queue. Catches static routes, programmatic pages, legacy URLs — anything DB triggers miss. Bulk insert in chunks of 500.
- **Cron jobs** (pg_cron):
  - `google-indexing-auto-flush` — every 5 min — `submit_pending` (limit 5) — drains queue with exponential backoff.
  - `google-indexing-auto-run-hourly` (job 23) — `7 * * * *` — calls `auto_run`: discover → batch_submit → check_index_status, all quota-aware.
- **Daily quotas** (enforced inside `auto_run` / `quota_status`): submissions 1000/day (buffer 20), inspections 200/day (buffer 5). Computed from `indexing_logs` for the current UTC day.
- **IndexNow** (key `cc5b688453c4e43d3466783d7f7c426e`, hosted at `/cc5b688453c4e43d3466783d7f7c426e.txt`) is pinged alongside every Google submission — Bing/Yandex/Naver pick it up within minutes, free, no quota.
- **Backoff**: failed rows get `next_retry_at = now() + 2^retry_count minutes`, max 5 retries → `permanently_failed`.
- **Service-account secrets**: `GOOGLE_INDEXING_SERVICE_ACCOUNT` (full JSON) OR `GOOGLE_INDEXING_CLIENT_EMAIL` + `GOOGLE_INDEXING_PRIVATE_KEY` (split). Token URI optional.
- `submitToGoogleIndexing()` in `src/lib/googleIndexing.ts` is just a fire-and-forget nudge — DB trigger + crons do the real work.
- Admin UI at `/admin/google-indexing` exposes manual buttons for `discover`, `auto_run`, `quota_status`, plus per-row Search Console URL Inspection links.
