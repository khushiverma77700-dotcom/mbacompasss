# Plan: Mock Generation Progress + Course Builder Overhaul

## 1. Real-time AI Mock Generation Progress

Replace the simple loading state in `AIGenerateMockDialog` with a live progress panel powered by the existing `mock_section_jobs` planner/worker tables.

- Add a polling hook (`useMockGenerationProgress(generationId)`) that selects from `mock_section_jobs` every 2s while open.
- Show in the dialog (and a new `AIMockGenerationProgress` card on `AdminMockTests`):
  - Overall progress bar (`questions_done / total_questions` summed across sections).
  - "Sections: X done / Y total / Z pending / N failed".
  - "Questions: generated / total / remaining".
  - Per-section row with status pill (pending / processing / done / failed), current step, retry count.
  - "Currently generating" line and live spinner; auto-collapses to "Complete" when all sections settle.
- Reuse existing `AIGenerationProgress.tsx` component (already supports steps + counters) — feed it derived steps from job rows.
- The dialog `handleGenerate` returns immediately after planner kicks off; user can close dialog and watch progress on the mock test row.

## 2. Course Builder — Sectioned Form

Refactor `AdminMockBundles.tsx` create/edit dialog into a 3-step wizard:

**Step 1 — Basic Details** (existing fields: name, slug, exam_code, price, validity, cover image, description, highlight, published).

**Step 2 — Features & Offerings** (new). Each feature is a toggle:
- CAT Study Planner
- Performance Tracker
- Daily Tests
- Daily Mocks
- Previous Year Papers
- Personalized Mock Hub
- Deep Analysis
- Leaderboard
- Score Predictor
- AI Insights / Goals

Stored as JSONB `features` on `mock_bundles` (default empty → all locked).

**Step 3 — Mock Selection** (replaces the flat "items" list).
- Admin first picks one or more **categories** (CAT, NMAT, XAT, SNAP, IIFT, CMAT, MAT, Other).
- For each selected category, a table loads matching `mock_tests` filtered by `exam_code`, columns: checkbox, Name, Type (Full / Sectional via `category` or `level`), Sections, Questions, Duration, Live status.
- Search box + Full/Sectional sub-tabs per category.
- Selected mocks persist to existing `mock_bundle_items` table on save.

## 3. Student Dashboard — Locked Features

- Add helper `useEnrolledBundleFeatures()` that unions `features` JSONB across all active `mock_bundle_enrollments` for the user.
- Wrap each feature card / sidebar entry in `StudentLayout.tsx` and `StudentOverview.tsx` with a new `<FeatureGate feature="daily_tests">` component:
  - If included → render normally.
  - If not → render a blurred/disabled card overlay with a lock icon, message "Not included in your plan", and an **Upgrade** button opening a small dialog with Call (`tel:`) and Email (`mailto:`) CTAs to support.
- Sidebar items get a small lock badge but stay visible.

## 4. Database Changes

```sql
ALTER TABLE public.mock_bundles
  ADD COLUMN features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN included_categories text[] NOT NULL DEFAULT '{}';
```

No changes needed to `mock_bundle_items` — already supports test_id list.

## 5. Files Touched

- **New**: `src/hooks/useMockGenerationProgress.ts`, `src/hooks/useEnrolledBundleFeatures.ts`, `src/components/student/FeatureGate.tsx`, `src/components/student/UpgradeDialog.tsx`, `src/components/admin/CourseBuilderWizard.tsx`, `src/components/admin/CourseMockPicker.tsx`.
- **Edited**: `src/components/admin/AIGenerateMockDialog.tsx`, `src/pages/admin/AdminMockTests.tsx` (live progress card), `src/pages/admin/AdminMockBundles.tsx` (use wizard), `src/pages/student/StudentLayout.tsx`, `src/pages/student/StudentOverview.tsx` (FeatureGate wrapping).
- **Migration**: add `features` + `included_categories` columns.

## 6. Out of Scope

- No changes to the AI generation backend (planner/worker already exists from prior step).
- Upgrade flow uses contact CTAs only (no in-app purchase changes).
- Existing bundles without `features` set default to **all features unlocked** to preserve current student access.

Approve to start implementation.
