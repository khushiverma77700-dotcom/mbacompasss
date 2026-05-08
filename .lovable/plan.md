## Bulk AI Mock Generation Module

A new admin workflow that lets the content team queue many AI-mock generation requests in one go and let them process automatically in the background.

### What we'll build

**1. New admin page** at `/admin/bulk-mock-generation` (link added to admin sidebar under "Mock Tests").

The page has two tabs:

**Tab A — Builder (Queue Composer)**
- "Add request" form with dropdowns:
  - Exam Type (CAT, NMAT, XAT, SNAP, IIFT, CMAT, MAT)
  - Mock Type / Category (Full-Length, Sectional, Topic-wise, Daily Quiz, Practice Set)
  - Section (auto-populated from chosen exam, only for Sectional / Topic / Practice / Daily)
  - Topic (free text + suggestions from existing question topics — only for Topic-wise / Practice / Daily)
  - Difficulty (Easy, Moderate, Hard, Mixed)
  - Number of Questions
  - Number of Sets (1–10)
  - Optional Test Name Prefix
- "Add to Queue" appends a row to the local draft list.
- Draft rows can be **edited, duplicated, or deleted** before submission.
- "Submit All" creates one `bulk_mock_request` parent + N `bulk_mock_request_items` (status `pending`) and immediately returns. A separate worker picks them up.

**Tab B — Queue Dashboard**
- Live table of all bulk requests + items grouped by parent batch.
- Each row shows: Exam · Type · Section · Topic · Difficulty · Q-count · Sets · **Status** (Pending / In Progress / Completed / Failed / Needs Review) · progress bar (questions generated / requested) · created mock test link · error.
- Per-row actions: **Pause, Resume, Retry, Duplicate, Delete** (only allowed when not actively processing).
- Auto-refreshes every 3s.

**2. New backend pieces**

- Tables (migration):
  - `bulk_mock_requests` — batch metadata, created_by, totals, status
  - `bulk_mock_request_items` — one row per queued mock with all params, `status`, `progress`, `generation_id` (FK to existing `ai_mock_generations`), `error_message`, `paused`, `retry_count`
  - RLS: admin-only.

- Edge function `bulk-mock-worker` (invoked by cron every 1 min + immediately after submit):
  - Claims up to N pending, non-paused items.
  - Calls existing `generate-mock-questions` function in background per item, stores returned `generation_id`.
  - Subsequent ticks update item status by reading `ai_mock_generations` and `mock_section_jobs` for that `generation_id`.
  - Marks `Needs Review` when generation completes with `failed` sections > 0 but some succeeded.

- Cron schedule (pg_cron): `bulk-mock-worker` every minute.

**3. Reuse, not rewrite**

- Generation engine (`generate-mock-questions`), exam profiles, section plans, dedupe, watchdog, and the Mock Builder UI all stay untouched.
- We only orchestrate calls in bulk and surface a queue UI.

### Files to add / modify

```text
supabase/migrations/<ts>_bulk_mock_generation.sql        (new tables + RLS + cron)
supabase/functions/bulk-mock-worker/index.ts             (new worker)
src/pages/admin/AdminBulkMockGeneration.tsx              (new page — Builder + Queue tabs)
src/pages/admin/adminNav.ts                              (add nav entry)
src/App.tsx                                              (add route)
```

### Out of scope (for this round)

- Editing the *generated* questions in bulk (already covered by existing Mock Builder).
- Changing the per-question AI prompt logic.

Confirm and I'll start with the migration.