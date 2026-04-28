## Overview
Seven-part overhaul of the admin mock-test system: fix admin permissions (auto-grant new sections), remove the duplicate MBA Compass Courses module, rewrite the AI mock generator for reliable multi-section output with live progress, add a manual question editor (rich-text + TITA + bulk import + per-question AI assist), enrich the mock dashboard with completion tracking and filters, scrub default heading tags from public mock pages, and enforce unique mock names with auto-generated slugs.

---

## 1. Admin Access Control — auto-include new sections

**Problem:** `ADMIN_SECTIONS` in `AdminManageAdmins.tsx` is a hand-maintained list of ~25 paths. New admin pages added later (Mock Tests, Mock Bundles, Daily Tests, Personalized Hub, Google Indexing, etc.) are invisible in the permission picker, so a "full access" admin still cannot reach them.

**Fix:**
- Move the canonical sidebar config into `src/pages/admin/adminNav.ts` (single source of truth, exported).
- `AdminLayout.tsx` consumes it (no behaviour change).
- `AdminManageAdmins.tsx` derives `ADMIN_SECTIONS` from that same config — every group + item shown as a checkbox tree, grouped by section header (Overview, Colleges, CAT Mocks, …).
- "Full Access" toggle now selects every path from the live config, so future additions are auto-included.
- Add a one-time SQL backfill: any existing `admin_permissions` row with `array_length(allowed_sections) < (current total)` and an `is_full_access` flag (new boolean column, default false) gets `allowed_sections` rewritten on each save when the toggle is on. The auth context already treats `allowed_sections = null` as super-admin — we keep that behaviour and additionally honour the new `is_full_access` flag (computed client-side in the picker).

---

## 2. Remove MBA Compass Courses (admin module only)

`MBA Compass Courses` (table `mba_compass_courses`) is a marketing-only catalog at `/mba-compass` that records orders but does NOT grant mock access. It duplicates Mock Bundles in admin perception. **Mock Bundles stays** as the canonical paid-mock pipeline.

**Removed:**
- Sidebar entry `MBA Compass Courses` in `AdminLayout.tsx`.
- Route `/admin/mba-compass-courses` in `App.tsx`.
- Files: `src/pages/admin/AdminMBACompassCourses.tsx`, `src/pages/MBACompassCoursesPage.tsx`, `src/pages/MBACompassCourseDetailPage.tsx`, `src/pages/MBACompassComparePage.tsx`.
- Public routes `/mba-compass*`.
- Edge functions `razorpay-create-order` and `razorpay-verify-payment` are kept (they may be referenced elsewhere) but the `mba_compass_courses` lookup branches are removed.
- Memory file `mem://features/day-planner-and-mba-compass` updated to drop the Compass section.

**Kept untouched:** `mock_bundles`, `/admin/mock-bundles`, `/courses`, bundle Razorpay flow, `unlock_bundle_mocks`. The sidebar label is renamed from "Mock Bundles (Courses)" to **"Mock Bundle Courses"** so it's the obvious paid-courses module.

**Database:** `mba_compass_courses`, `mba_compass_orders` and related tables are NOT dropped (preserves any past order receipts). They're simply unreferenced from the app. A note added to admin docs.

---

## 3. AI generation — all sections must populate

**Root cause of single-section bug:** The current loop awaits each section sequentially inside one long `EdgeRuntime.waitUntil`. Edge functions have a hard wall-clock cap (~150s for waitUntil), and Lovable AI Gateway 429s on heavy bursts. The first section consumes the budget, later sections silently fail and the generation row is marked "completed" anyway because `total_generated > 0`.

**Fix:**
- Split work: orchestrator function `generate-mock-questions` becomes a **planner** — it inserts the `mock_test`, all `mock_sections` (with `total_questions`, `mcq_count`, `tita_count`, `topic`, `strict_topic`), and a row per section in a new `mock_section_jobs` table (status=pending). Returns immediately with `generation_id`.
- New worker function `generate-section-questions` processes ONE section per invocation. Idempotent (claims a job row via `worker_lock_until`), generates in batches of 8, dedups by `content_hash`, retries up to **3 times per failed batch**, and updates `questions_done / questions_total` on the job row after every batch.
- The planner fan-outs by invoking the worker once per section with `EdgeRuntime.waitUntil` (parallel). A pg cron `*/2 minutes` calls `mock-section-watchdog` to requeue any job stuck in `processing` longer than 4 minutes (mirrors the existing `recover_stale_bulk_jobs` pattern).
- `ai_mock_generations.status` is rolled up from `mock_section_jobs` (`failed` if any section has `attempts >= 3` and is still incomplete; `completed` only when every section reaches its target).

**New table `mock_section_jobs`:** test_id, section_id, exam_code, category, level, total_questions, mcq_count, tita_count, topic, status, attempts, questions_done, current_step, worker_lock_until, error_message.

---

## 4. Manual question authoring + AI assist

**New page:** `/admin/mock-tests/:id/builder` (the existing route gets a major rewrite).

**Per-section panel** with:
- **Tab 1 — Manual editor:** TipTap rich-text for question_html, options A–D (rich text + "is correct" radio), TITA answer list + tolerance, explanation_html, topic, subtopic, difficulty. Save button inserts/updates `mock_questions` + `mock_question_options`.
- **Tab 2 — Bulk import:** Paste CSV (`question_text,type,opt_a,opt_b,opt_c,opt_d,correct_label,tita_answers,topic,difficulty,explanation`) or JSON array. Preview + dry-run errors before commit.
- **Tab 3 — AI assist (per question):** "Re-write", "Generate options", "Generate explanation" buttons that call existing `generate-mock-questions` in single-question mode (new `mode: "single"` parameter that returns one question without inserting).
- **Tab 4 — AI bulk fill:** "Generate N more questions for this section" — invokes `generate-section-questions` directly with a `target_delta`.

Section header shows live counter `done / total` with a progress bar; pulls from `mock_section_jobs` if a generation is running, otherwise from `count(mock_questions where section_id=...)`.

---

## 5. Mock dashboard — tracking & filters

`AdminMockTests.tsx` gets:
- Per-row columns: **Sections** (e.g. `3/3`), **Questions** (`64/72`), **Status pill** (Empty / In progress / Complete / Generating). Computed by joining `mock_sections` and counting `mock_questions`.
- New filter tabs: **All / Empty / Incomplete / Complete / AI generating / Failed**.
- Search by name + slug.
- "Live generations" panel at the top showing any `ai_mock_generations` with `status='running'` and a per-section progress bar.

---

## 6. Public frontend — only the mock name as heading

`MockTestIntroPage.tsx` currently renders `<h1>{test.name}</h1>` followed by a system "Read the instructions carefully…" subtitle and an `<h2>Sections</h2>`. Per the request:
- Keep only the mock name as the visible page title (still an `<h1>` for SEO, but no extra system "Mock Test #1 — AI" suffix).
- Strip any "— AI" / "Full-Length Mock #1 — AI" auto-suffix from `mock_tests.name` on save (and a one-time backfill that renames existing `% — AI` records by removing the suffix).
- Remove the standalone `<h4>` / `<h2>Sections</h2>` heading; render the section list with a plain bold label instead.
- `MocksListPage.tsx` already shows `t.name` only — no change needed there.

---

## 7. Auto slug + unique name

- DB: add `UNIQUE (lower(name))` constraint on `mock_tests` via partial unique index.
- Form (`AdminMockTests.tsx`): slug input becomes read-only and is always recomputed from `slugify(name)`. On save, if Postgres returns the unique-violation error code `23505` we surface an inline "A mock with this name already exists. Please pick a unique name."
- AI generator no longer appends `Date.now()` to the slug; relies on the unique-name constraint instead. If a duplicate name is requested via AI prefix, the generator returns 409 with a clear error so the admin can rename and retry.

---

## Technical notes

**Migrations**
1. `admin_permissions.is_full_access boolean default false`.
2. `mock_section_jobs` table + RLS (admin-only) + indexes on `(status, worker_lock_until)`.
3. Partial unique index `mock_tests_unique_name_idx on mock_tests (lower(name))`.
4. Backfill: `UPDATE mock_tests SET name = regexp_replace(name, '\s*[—-]\s*AI$', '') WHERE name ~ '[—-]\s*AI$'`.
5. Cron job `mock-section-watchdog` every 2 minutes.

**Edge functions**
- Modify: `generate-mock-questions` (becomes planner; supports `mode: "single"` for AI-assist).
- New: `generate-section-questions` (worker), `mock-section-watchdog` (requeue stale jobs).

**Frontend**
- Modify: `AdminLayout.tsx`, `AdminManageAdmins.tsx`, `AdminMockTests.tsx`, `AdminMockBuilder.tsx`, `MockTestIntroPage.tsx`, `App.tsx`.
- New: `src/pages/admin/adminNav.ts`, `src/components/admin/MockSectionEditor.tsx`, `src/components/admin/MockBulkImportDialog.tsx`, `src/components/admin/MockGenerationProgress.tsx`.
- Delete: `AdminMBACompassCourses.tsx`, `MBACompassCoursesPage.tsx`, `MBACompassCourseDetailPage.tsx`, `MBACompassComparePage.tsx`.

**Out of scope**
- The `mba_compass_courses` table is preserved (not dropped) so historical orders remain queryable.
- `personalized-questions-generate` and the Personalized Hub are untouched.
- Mock test runner (`MockTestRunnerPage.tsx`, calculator, palette) stays as-is from the previous turn.
