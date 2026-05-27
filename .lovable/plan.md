## Goal

`dashboard.mbacompass.in/demo` should render the **same UI** as the live `/student` dashboard (StudentLayout + StudentOverview + child pages), but with:
- Student identity = **Aman Verma** (Aman dummy profile, 97.1%ile, 34-day streak, 11,280 XP, Rank #248)
- Every chart, leaderboard, weak topics list, planner task list etc. **pre-filled with realistic dummy data** (instead of empty Supabase results for a non-existent user)
- Feature cards (B-School Vocabulary, Quant Formula Book, News & Insights) → **first card clickable** (opens detail dialog), rest blurred with "Unlock Full Access" overlay
- All other clicks intercepted by the existing `DemoShell` upsell popup (already working)

## Plan

### 1. Stop rendering the custom DemoDashboard at `/demo`
- `src/App.tsx` — remove the standalone `<Route path="/demo" element={<DemoDashboard/>}>` route. Keep only the StudentLayout-based parent route so `/demo` resolves to the real `StudentOverview` index route.
- Remove unused `DemoDashboard` lazy import (file kept for reference but not routed).

### 2. Demo-mode data adapter
Single source of truth so the live components don't need invasive rewrites.

- New file `src/lib/demoData.ts` — exports Aman's full dummy dataset:
  - profile (`displayName`, `email`, `target_exam`)
  - `attempts[]` (7 submitted mocks, realistic percentiles 79 → 97.1, sectional_scores, accuracy, total_score, started_at/submitted_at)
  - `enrollments[]`, `goals[]`, `tasks[]` (today's planner), `weak_topics[]`, `rewards` (XP 11280 / level 17 / streak 34), `leaderboardRank: 248`, `examCountdowns[]`
  - `vocabulary`, `formulas`, `news` first-card previews
- New hook `src/hooks/useDemoMode.ts` — `useDemoMode()` returns `true` when pathname starts with `/demo`.

### 3. Short-circuit the data layer in demo mode
Minimal, surgical injections — no UI changes to the live components.

- `src/contexts/AuthContext.tsx` (or `StudentLayout.tsx` if cleaner) — in demo mode, expose `user = { id: "demo-user", email: "aman@demo.in", user_metadata: { display_name: "Aman Verma" } }`.
- `src/hooks/useStudentPerformance.ts` — early return `DEMO_DATA.attempts` when `useDemoMode()` is true.
- `src/pages/student/StudentOverview.tsx` — wrap each `supabase.from(...)` query in an `if (isDemo) { apply(DEMO_DATA.xxx); return; }` guard at the top of the `run(...)` block. ~7 guards, each 2 lines.
- Same pattern for `StudentLeaderboard`, `StudentDayPlanner`, `StudentPerformX` index pages (only the data fetches — no JSX changes).

### 4. Lock feature cards in demo mode
- `src/pages/student/vocabulary/StudentVocabularyFeed.tsx`, `StudentFormulaBook.tsx`, `StudentNewsroom.tsx` — when `useDemoMode()` is true, render only the dummy preview list: first card normal, rest wrapped with the existing `LockedOverlay` from `DemoDashboard.tsx` (extract to `src/components/demo/LockedOverlay.tsx` so it can be shared).
- All other interactions are already intercepted by `DemoShell`'s `ClickInterceptor` (popup on any non-allowed click), so no extra wiring needed.

### 5. Sidebar branding in demo mode
- `StudentLayout.tsx` — when in demo mode, show the existing "DEMO MODE · FULL ACCESS PREVIEW" pill in the top bar and the "READ-ONLY PREVIEW · Buy Full Course" CTA in the sidebar (matching today's demo look).

## Files touched

```
src/App.tsx                              (remove standalone /demo route)
src/lib/demoData.ts                      (new — Aman dummy dataset)
src/hooks/useDemoMode.ts                 (new)
src/components/demo/LockedOverlay.tsx    (new — extracted from DemoDashboard)
src/contexts/AuthContext.tsx             (demo user override)
src/hooks/useStudentPerformance.ts       (demo short-circuit)
src/pages/student/StudentOverview.tsx    (demo guards on data fetches)
src/pages/student/StudentLeaderboard.tsx (demo guards)
src/pages/student/StudentDayPlanner.tsx  (demo guards)
src/pages/student/StudentPerformX.tsx    (demo guards)
src/pages/student/vocabulary/StudentVocabularyFeed.tsx (demo lock overlay)
src/pages/student/formulas/StudentFormulaBook.tsx      (demo lock overlay)
src/pages/student/StudentNewsroom.tsx                  (demo lock overlay)
src/pages/student/StudentLayout.tsx       (demo top-bar pill + sidebar CTA)
```

## What I'm NOT changing
- Live `/student` dashboard behaviour for real students — every change is gated behind `useDemoMode()`.
- Backend, RLS, Supabase data.
- `DemoShell` click-interceptor logic (already working).

## Risk
- Touching `StudentOverview.tsx`, `useStudentPerformance.ts`, and `AuthContext.tsx` is invasive even with guards. I'll run a build check after each major edit and verify `/student` still works for logged-in users by inspecting that `useDemoMode()` returns `false` on `/student/*`.

Approve and I'll execute step by step.