## Goal
Turn the existing `My Day Planner` into a complete personal productivity assistant: editable tasks with recurrence, automatic rollover of unfinished tasks, smart suggestions linked to platform actions (mocks, daily test), and a dedicated Performance dashboard with daily/weekly/monthly/custom views + 12-week heatmap.

## Database (one migration)

Extend `student_planner_tasks`:
- `recurrence` text (`none` | `daily` | `weekly` | `weekdays` | `custom`)
- `recurrence_days` int[] — for weekly/custom (0=Sun … 6=Sat)
- `recurrence_until` date — optional end
- `series_id` uuid — groups all instances of one recurring template
- `linked_action` text — e.g. `daily_test`, `mock:<slug>`, `personalized_hub`
- `linked_ref` text — slug / id used by the action button
- `rolled_over_from` date — last date this task was carried from
- `auto_rollover` boolean default true — chosen at create time
- `original_date` date — first scheduled date (for streak math)

New table `student_planner_skips` (user_id, series_id, skipped_date) so a student can permanently skip one occurrence of a recurring template without deleting the series.

RLS: owner-only on both. Indexes on `(user_id, scheduled_date)` and `(user_id, series_id)`.

DB function `rollover_planner_tasks(_user_id uuid)` — SECURITY DEFINER, idempotent. For every task where `scheduled_date < CURRENT_DATE`, `status = 'pending'` and `auto_rollover = true`, advance to today and stamp `rolled_over_from`. Called from the client on first load each day (cheap, indexed).

DB function `materialize_recurring_tasks(_user_id uuid, _through date)` — generates concrete instances from a series template through `_through` (default today + 14d), skipping dates in `student_planner_skips`. Called from the client.

## Frontend

### `src/pages/student/StudentDayPlanner.tsx` (refactored)
Three top-level tabs:
1. **Yesterday** — read-only review; missed pending tasks show "Move to today" / "Skip permanently".
2. **Today** — pending highlighted at top, completed collapsed at bottom. Smart suggestion strip ("Today's daily test not attempted → Start now") wired to `useEnrolledBundleFeatures` + `get_today_daily_test` RPC.
3. **Tomorrow** — preview + add buttons.

`+ Add Task` dialog gets:
- Recurrence select (One-time / Daily / Weekdays / Weekly on selected days / Custom)
- "Auto-move if not done" toggle (default ON) — controls `auto_rollover`.
- Optional "Link to action": Daily Test / a mock slug / Personalized Hub. Renders inline `Start` button on the task card.

Edit task: same dialog reused, prefilled.

### `src/pages/student/StudentPlannerPerformance.tsx` (new)
Dedicated route `/student/day-planner/performance`. Range selector (Day / Week / Month / Custom date range using shadcn DatePicker). Shows:
- Completion %, current streak, longest streak, total focus minutes — KPI cards
- Area chart: planned vs completed over selected range
- Bar chart: focus minutes per day
- Pie: time by category
- 12-week heatmap (existing, polished)
- Best day / hardest weekday insights

Charts powered by existing `recharts`; data derived purely from `student_planner_tasks` rows fetched once, filtered client-side per range.

### `src/components/student/PlannerSuggestions.tsx` (new)
Reads `get_today_daily_test` + recent `mock_attempts`. Surfaces 1–3 contextual cards ("Attempt today's daily test", "Resume CAT Mock 3", "Hub session pending"). Single-click adds them as today's tasks with `linked_action`.

### Sidebar
Add second nav row inside the existing "My Day Planner" item: small `Performance` link beneath, gated by enrolled features same as parent.

## Auto-rollover trigger point
On `StudentDayPlanner` mount, if `localStorage["planner_rollover_date"] !== today`, call `rollover_planner_tasks` + `materialize_recurring_tasks`, then set the flag. Cheap and runs at most once per browser per day.

## Out of scope
- Email/push reminders (in-dashboard notification only via existing `NotificationBell`).
- Sharing tasks across users.
- Native mobile.

## Files

Create:
- `supabase/migrations/<ts>_planner_v2.sql`
- `src/pages/student/StudentPlannerPerformance.tsx`
- `src/components/student/PlannerSuggestions.tsx`
- `src/components/student/PlannerTaskDialog.tsx` (extracted reusable create/edit)
- `src/lib/plannerRecurrence.ts` (helpers)

Edit:
- `src/pages/student/StudentDayPlanner.tsx` — tabs, suggestions, edit support, auto-rollover trigger
- `src/pages/student/StudentLayout.tsx` — sidebar sub-link
- `src/App.tsx` — new route

Routes touched: `/student/day-planner`, `/student/day-planner/performance`.
