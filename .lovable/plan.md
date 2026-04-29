## Mock System with Bundle-Based Access — Implementation Plan

The core infra (mock_bundles, mock_bundle_items, mock_bundle_enrollments, FeatureGate, CourseMockPicker, AdminMockBundles 3-step wizard) already exists. This plan fills the four real gaps: (1) bundles are not yet linked to `mba_compass_courses`, (2) only `full_length` and `sectional` test types exist, (3) StudentMocks is split by exam series only — not by Full/Sectional/Topic/Practice, (4) there is no consistent locked-mock card or "Attempted" bucket on the frontend.

---

### 1. Database changes (one migration)

- Extend the `test_type` enum: add `topic_wise` and `practice_set`.
- New table `course_bundles` — many-to-many between `mba_compass_courses` and `mock_bundles`:
  ```text
  course_id uuid → mba_compass_courses(id) on delete cascade
  bundle_id uuid → mock_bundles(id)        on delete cascade
  sort_order int default 0
  PRIMARY KEY (course_id, bundle_id)
  ```
  RLS: public can SELECT (catalog visibility); admins can write.
- New trigger function `unlock_course_bundles_on_enrollment()` on `course_enrollments` AFTER INSERT — for every linked bundle, call existing `public.unlock_bundle_mocks(user_id, bundle_id)`. This means buying ONE course auto-grants all its bundles → all their mocks via the existing `mock_enrollments` cascade.
- Backfill: for any existing `course_enrollments`, insert matching `mock_bundle_enrollments` for already-linked bundles.

### 2. Admin Panel

**a. Courses ↔ Bundles linker** — `src/pages/admin/AdminMBACompassCourses.tsx`
Add a "Bundles" step/section to the course edit dialog: multi-select chip list of all published bundles (`mock_bundles`), persisted to `course_bundles`. Show count on course card.

**b. Mock Test type selector** — `src/pages/admin/AdminMockTests.tsx`
Add `topic_wise` and `practice_set` to the test_type dropdown with labels "Topic-wise Test" and "Practice Set".

**c. AdminMockBundles** — already 3-step. Update `CourseMockPicker` Type sub-tabs to include the two new types so admins can pick topic/practice mocks into a bundle. Already wired via `included_categories`; just extend the type list.

### 3. Student Frontend — `/student/mocks` (`StudentMocks.tsx`)

Restructure into a **two-level tab system**:

- **Primary tabs (test type):** Full Length · Sectional · Topic-wise · Practice Sets · Attempted
- **Secondary chip filters (exam):** All · CAT · XAT · NMAT · SNAP · IIFT · CMAT · MAT · TISSNET

Behavior:
- Query both `mock_enrollments` (for owned/accessible mocks) AND a catalog of all published mocks matching the user's enrolled bundle types — so unowned mocks render as locked cards instead of being hidden. Use the existing `<FeatureGate>`/`UpgradeDialog` pattern.
- **Coming Soon:** any mock with `launch_date > now()` OR `scheduled_start_at > now()` shows a "Coming Soon · DD MMM" badge and disables the Start button.
- **Attempted tab:** mocks where the user has at least one `submitted`/`auto_submitted` `mock_attempts` row, showing score, percentile, accuracy with Result + Review CTAs.
- **Empty state per tab:** "No [Topic-wise] mocks in your active courses yet — Upgrade course to unlock this content." with a "Browse Courses" CTA to `/courses`.

### 4. Locked content card

Reuse `<FeatureGate>` visual: blurred mock card + lock icon + message "Upgrade course to unlock this content." + "Upgrade" button → `UpgradeDialog`. Apply when a mock appears in the catalog (matches user's exam interest / is published) but the user has no active enrollment for it.

### 5. Memory update

Update `mem://features/mock-bundles` to note: (a) bundles now link to courses via `course_bundles`, (b) test_type enum includes `topic_wise` and `practice_set`, (c) StudentMocks is structured by type × exam with an Attempted tab.

---

### Out of scope (already working)

- Bundle creation wizard, feature toggles, FeatureGate, UpgradeDialog
- `unlock_bundle_mocks` RPC and `mock_bundle_enrollments → mock_enrollments` sync trigger
- Razorpay course/bundle checkout
- Admin Students panel (already at `/admin/student-mocks`)

### Risk notes

- Adding enum values is non-destructive; existing rows unchanged.
- The trigger on `course_enrollments` is additive — it won't revoke access if a course's bundle list is later edited (intentional; revocation would need explicit admin tooling).
- Catalog query for locked cards must respect `is_published = true` to avoid leaking drafts.
