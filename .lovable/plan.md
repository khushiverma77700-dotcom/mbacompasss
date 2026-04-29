# Premium Mock Platform — Polish & Unification

The bundle system, course→bundle linking, locked-content UX, four-category filters (Full Length / Sectional / Topic-wise / Practice Sets), exam chips, "Coming Soon" labels and the Attempted tab were all built in the previous turn. This plan covers what's still missing: **premium UI, dark mode, a single performance engine, and admin nav cleanup.**

## 1. Central Performance Engine (highest priority)

Today every student page (`StudentOverview`, `StudentPerformance`, `StudentMocks`, day planner) re-queries `mock_attempts` independently with slightly different shapes. We'll consolidate.

- New hook `src/hooks/useStudentPerformance.ts` — single source of truth.
  - Fetches `mock_attempts` + `personalized_mock_attempts` + `student_daily_test_progress` once, caches via React Query.
  - Computes: overall percentile trend, section-wise accuracy, speed (sec/q), strongest/weakest topics, last-7-day activity, streak, total attempts, improvement delta vs previous mock.
- Realtime: subscribe to `mock_attempts` insert/update for `auth.uid()` so dashboards refresh the moment a mock is submitted (no manual refresh).
- Refactor `StudentOverview`, `StudentPerformance`, `StudentMocks` (Attempted tab), and the new "My Stats" widget on bundle cards to consume this hook. No isolated queries.

## 2. Dark Mode (LMS + Admin)

- Add `next-themes` provider scoped via `class` strategy.
- Extend `src/index.css` with a `.dark` block mirroring every existing token (background, card, primary stays sky-blue, muted, border, etc.). Keep the white/light-blue brand on light mode untouched.
- Theme toggle (sun/moon) in `StudentLayout` topbar and `AdminLayout` topbar. Persist in `localStorage` key `mbacompass-theme`.
- Public marketing pages stay forced-light (wrap `<PublicLayout>` with `data-theme="light"` override) to protect SEO/brand.
- Audit cards / charts (recharts) for hardcoded `#fff` / `bg-white` and swap to `bg-card text-card-foreground` so dark mode looks polished, not inverted.

## 3. Premium UI Pass on Student LMS

Apply a consistent "high-end" visual language across `/student/*`:

- **Stat cards**: gradient ring, large number, delta chip (↑12% vs last mock), micro-sparkline. Reusable `<StatCard>` component.
- **Section headers**: H2 + one-line tooltip explainer (lucide `Info` icon).
- **Charts**: unify color palette via CSS vars (sky-500, blue-600, cyan-400) so they auto-recolor in dark mode. Add subtle grid, rounded corners, hover tooltips with section icons.
- **Bundle / mock cards** on `StudentMocks`: glassmorphism on hover, "Locked" overlay uses blurred backdrop + lock icon + CTA "Upgrade to unlock", "Coming Soon" uses gradient ribbon with launch date countdown.
- **Attempted tab**: each row shows score, percentile band (color-coded), accuracy bar, time used, and three CTAs (View Report / Solutions / Leaderboard).
- **Skeleton loaders** everywhere instead of "Loading…" text.
- **Empty states**: friendly illustration + single primary CTA.

No new routes — pure presentational refactor of existing pages.

## 4. Feature Toggle Visibility

`FeatureGate` and `course_features` already exist. We'll make the OFF behavior cleaner:

- When a feature is OFF for the student's enrolled course(s), hide the nav item entirely (today it shows a lock badge). Add a single "Locked features" section at the bottom of `/student` overview listing what's available with an upgrade.
- Admin `Course Builder → Features` step already has ON/OFF toggles — verify Daily Tests, Personalized Hub, AI Tools toggles map correctly and tighten copy.

## 5. Admin Nav Cleanup (mock group only)

In `src/pages/admin/adminNav.ts`, rename the "CAT Mock Tests" group to **"Mock Platform"** with exactly four primary items:

```text
Mock Platform
├── Courses    → /admin/mba-compass-courses
├── Bundles    → /admin/mock-bundles
├── Mocks      → /admin/mock-tests
└── Students   → /admin/student-mocks
```

Move the secondary mock items (Landing Page, Personalized Hub, Daily Tests, Announcements, Push Notifications) into a collapsible "More tools" sub-group under Mock Platform. All other admin groups (Institutes, Colleges, Content, Leads, etc.) stay exactly as they are.

## Files touched

- **New**: `src/hooks/useStudentPerformance.ts`, `src/components/student/StatCard.tsx`, `src/components/student/EmptyState.tsx`, `src/components/ThemeToggle.tsx`, `src/contexts/ThemeProvider.tsx`.
- **Edited**: `src/index.css` (dark tokens), `src/App.tsx` (wrap with ThemeProvider), `src/pages/student/StudentLayout.tsx` (toggle + hide locked nav), `src/pages/student/StudentOverview.tsx`, `src/pages/student/StudentPerformance.tsx`, `src/pages/student/StudentMocks.tsx`, `src/pages/admin/AdminLayout.tsx` (toggle), `src/pages/admin/adminNav.ts` (group rename + restructure).
- **No DB migrations** — bundles, course_bundles, enums, triggers were all created last turn.

## Out of scope

- Marketing pages dark mode (kept light intentionally).
- New AI features — performance analytics reuses existing `mock_attempts` columns, no new edge functions.
- Schema changes — already in place.
