
## Goal

Two changes across Mock Result, Student Performance and Student Overview:

1. **Hide all "Percentile" everywhere in result/report UI** — replace with Score / Score% / Marks-based equivalents.
2. **Add a new "All India Rank" tab** in My Insights as the **first tab**, powered by a Projected AIR engine that unlocks per mock **7 days after the user's submission**.

---

## Part 1 — Hide Percentile, show Score-based metrics

Files to edit (presentation-only):

- `src/components/mock/report/KPIGrid.tsx` — replace the "Percentile" KPI card with **"Score %"** (`total_score / max_score × 100`). Keep all other cards.
- `src/components/mock/report/ProgressTrend.tsx` — remove the percentile line/axis; chart **Score** and **Score %** only.
- `src/components/mock/AnimatedAIReport.tsx` and `src/components/mock/SampleAIReport.tsx` — remove percentile callouts, swap to score / score% / accuracy phrasing.
- `src/pages/mocks/MockResultPage.tsx` — line 357 "%ile" hero block → render `total_score / max_score` with score%. Stop passing percentile to KPIGrid/ProgressTrend.
- `src/pages/student/StudentPerformance.tsx` and `src/pages/student/StudentOverview.tsx` — replace any "avg percentile / best percentile / percentile trend" widgets with **Avg Score**, **Best Score**, **Score % trend** (data already in `useStudentPerformance` via `avgScore` and `trend.score`).
- `src/hooks/useStudentPerformance.ts` — keep the field for backward compat but stop surfacing percentile-derived widgets in the UI layer (no schema change).

Percentile values stay in DB (`mock_attempts.percentile`) for future use — only the UI is hidden. The single exception is the new AIR tab (Part 2) which computes its own projected AIR/percentile from the engine.

---

## Part 2 — "All India Rank" tab (My Insights)

Place as the **first tab** in My Insights on `StudentPerformance.tsx` (and a compact card on `StudentOverview.tsx`).

### Tab behavior

For each submitted attempt, show one row:

- If `now() - submitted_at < 7 days` → **Locked**. Show countdown ("Available in 4d 12h") and message: *"All India Rank is calculated 7 days after submission, once the national benchmark pool is finalized."*
- If `≥ 7 days` → **Unlocked**. Show: Projected AIR (bucketed e.g. `Approx AIR 800–850`), Estimated Percentile, Students Ahead, Students Behind, Topper Score, Gap from Topper, Difficulty Level, Sectional AIR (per section).

Header labels everywhere: **"Projected AIR"**, **"AI-Powered National Ranking"**, **"Based on projected benchmarking from 2000+ aspirants"**. Never "Official AIR".

### Engine (edge function: `projected-air`)

New Supabase edge function `supabase/functions/projected-air/index.ts`. Input: `{ attempt_id }`. Auth via JWT (user can only request their own attempts).

Algorithm per `(test_id, user)`:

1. Fetch all **real** submitted attempts for the `test_id` where `submitted_at <= attempt.submitted_at + 7 days` (the cohort frozen at the 7-day mark).
2. Refuse with `locked: true, unlocks_at` if `now < submitted_at + 7d`.
3. Compute `real_mean`, `real_std` from cohort scores.
4. `TARGET_POOL = 2000`; `synthetic_count = max(0, TARGET_POOL - cohort.length)`.
5. Generate synthetic scores via seeded Gaussian (`seedrandom`-style with `seed = test_id`):
   - `mean = real_mean * adjustmentFactor(difficulty)` where `difficulty = real_mean / max_score` → factor 1.05 default, 1.1 if hard, 0.95 if easy.
   - `std = max(real_std, 10)`, clamp to `[0, max_score]`.
6. Merge, sort desc, find user rank (deterministic because synthetic pool seeded by `test_id`).
7. `percentile = ((TARGET_POOL - rank) / TARGET_POOL) * 100`.
8. Bucket AIR (`floor(rank/50)*50` → `Approx AIR X–Y`).
9. Sectional: repeat per `sectional_scores` key.

Cache result in new table `mock_projected_ranks` so the same `(attempt_id)` returns identical values forever (true stability):

```
mock_projected_ranks (
  attempt_id uuid PK FK→mock_attempts,
  user_id uuid,
  test_id uuid,
  projected_air int,
  air_bucket text,
  projected_percentile numeric,
  students_ahead int,
  students_behind int,
  topper_score numeric,
  difficulty text,
  sectional jsonb,
  pool_size int,
  computed_at timestamptz default now()
)
```
RLS: owner-only select; insert via security-definer function called by the edge function.

Frontend: new component `src/components/mock/report/AllIndiaRankTab.tsx` invoked from `StudentPerformance.tsx` as the first tab. Calls `supabase.functions.invoke('projected-air', { body: { attempt_id } })` per row, with React Query caching.

### Overview card

Small "Latest All India Rank" tile on `StudentOverview.tsx` showing the most recent unlocked attempt's AIR bucket; falls back to "Unlocks in Nd" if none unlocked yet.

---

## Out of scope (Phase 2/3 mentioned in spec)

Historical benchmark mapping, adaptive AI benchmarking, CAT percentile predictor model — only the MVP synthetic engine + 7-day lock + score-only reports ship now.

## Technical notes

- DB change is one new table only (no schema edits to `mock_attempts`).
- No removal of `percentile` from existing queries — purely UI hide.
- Seeded RNG: use `mulberry32(hash(test_id))` inside the edge function (no external deps).
- Bucket size constant `AIR_BUCKET = 50`.
