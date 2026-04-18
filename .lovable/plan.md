
The user wants new links to be automatically submitted to Google for crawling/indexing without any manual action.

Current state:
- `submitToGoogleIndexing()` exists and is wired into 4 admin save handlers (Articles, Colleges, Institutes, Exams).
- Each call hits Google Indexing API + IndexNow + pings sitemap.
- There's an hourly cron + nightly auto-run already.
- City pages, Categories, Courses, Coaching-of-week, Mega-menu items don't trigger auto-submit.

Gaps blocking "fully smooth":
1. New city/state pages (`AdminCityPages`) and category pages don't auto-submit on create.
2. There's no DB-level safety net — if an admin imports rows directly or a bulk insert happens, no submission fires.
3. `submitToGoogleIndexing` is fire-and-forget but if the edge function is cold/slow, the admin save UI waits.
4. No centralized "new URL detector" — relies on each form remembering to call the helper.

Proposed plan — make it bulletproof and zero-touch:

**Phase 1 — Database trigger (the real fix)**
Add a Postgres trigger on `articles`, `colleges`, `institutes`, `exams`, `city_pages`, `categories` that:
- On INSERT (and on UPDATE when slug/published changes) → enqueues the URL into the existing `indexing_urls` table with status `pending`.
- This guarantees submission fires no matter how the row was created (admin form, bulk import, SQL edit, future API).

**Phase 2 — Auto-flush worker**
- A lightweight cron (every 5 min) calls the `google-indexing` edge function with `action: "submit_pending"`.
- Function picks up pending URLs from `indexing_urls` and submits them in small batches (5 per run to avoid timeouts).
- Updates status → `submitted` / `failed` with retry counter.

**Phase 3 — Frontend stays fast**
- Remove the synchronous `await submitToGoogleIndexing(...)` from admin save handlers (the trigger now handles it).
- Save returns instantly; indexing happens in the background.
- Admin dashboard already shows live status.

**Phase 4 — Cover the missing admin sections**
Add the same trigger coverage for:
- `city_pages` (slug-based public URLs)
- `categories` (slug-based public URLs)

**Phase 5 — Resilience**
- Add `retry_count` + `next_retry_at` to `indexing_urls` so failed submissions auto-retry with backoff.
- Cap retries at 5; mark `permanently_failed` after.

**Files to change**
- New migration: triggers + columns on `indexing_urls`
- `supabase/functions/google-indexing/index.ts` — add `submit_pending` action with batch + retry logic
- Cron job (insert via `psql`, not migration — contains anon key)
- `src/pages/admin/AdminArticles.tsx`, `AdminColleges.tsx`, `AdminInstitutes.tsx`, `AdminExams.tsx` — make `submitToGoogleIndexing` non-blocking (or remove since trigger handles it)

**Result**
Any new or updated indexable row → automatically queued → submitted to Google + IndexNow + sitemap pinged within 5 minutes, with automatic retries on failure. No admin action required, works even for bulk imports.
