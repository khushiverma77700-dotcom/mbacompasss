---
name: google-indexing
description: Automated zero-touch Google + IndexNow indexing pipeline. DB triggers on articles/colleges/institutes/exams/city_pages/categories enqueue any new/updated row into indexing_urls. A pg_cron job (`google-indexing-auto-flush`, every 5 min) calls the `google-indexing` edge function with `action: submit_pending` which flushes 5 URLs per run to Google + IndexNow with exponential backoff (max 5 retries). Admin dashboard at /admin/google-indexing. IndexNow key: cc5b688453c4e43d3466783d7f7c426e.
type: feature
---
- DB function `enqueue_indexing_url()` + per-table AFTER INSERT/UPDATE triggers (`trg_enqueue_*`) automatically queue URLs into `indexing_urls` (status=pending). Covers articles (only when published), colleges, institutes, exams, city_pages (only when active), categories. Slug-based public URLs.
- Edge function action `submit_pending` (limit default 5, max 10) picks oldest pending/failed rows where `next_retry_at <= now()` and `retry_count < 5`, submits to Google Indexing API + IndexNow, updates status to `submitted` / `failed` / `permanently_failed`. Backoff: `2^retry_count` minutes.
- pg_cron job `google-indexing-auto-flush` runs `*/5 * * * *` and POSTs to the edge function. Created via supabase insert tool (contains anon key, can't go in migration).
- `submitToGoogleIndexing()` in `src/lib/googleIndexing.ts` is now just a fast nudge — DB trigger does the real work. Returns Promise so `.catch()` callers still type-check.
- Admin table row shows ExternalLink button to GSC URL Inspection (sc-domain:bschoolbuzz.com) — manual "Request Indexing" remains the only guaranteed sub-hour path.
- Indexing logs stored in `indexing_logs` with action `auto_flush` / `submit` / `indexnow_submit` etc.
- Hourly `refresh` cron + nightly `auto_run` cron continue to run alongside the new 5-min flush.
