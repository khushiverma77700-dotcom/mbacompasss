# Tougher, trustworthy mock scoring

## What will change
- Replace the current easy-to-hit percentile calculation with a competition-grade rank formula using each student's first submitted attempt, tie-aware ranking, and the real completed-student cohort.
- Stop presenting generated aspirants as real students. Every mock result will clearly show the verified number of unique students who completed that mock; small cohorts will be labelled provisional rather than awarding a misleading 100 percentile.
- Upgrade mock cards and reports with score, accuracy, verified participants, cohort average, top-10% benchmark, rank, gap from average, and difficulty context.
- Improve the My Insights averages to distinguish average score, average accuracy, and cohort percentile, with clearer trend and benchmark displays.
- Update the leaderboard to show total verified participation even when only the top 100 rows are displayed.

## Scoring rules
- One competitive entry per student per mock: earliest completed attempt only.
- Ties use mid-rank percentile rather than treating the latest scorer as automatically 100 percentile.
- Percentiles remain provisional until a meaningful real cohort exists; the interface will never invent participation numbers.
- Retakes still show personal score and analysis but do not inflate the competitive cohort.

## Technical details
- Add one authenticated, security-definer benchmark function with a fixed search path and narrow execute grants.
- Read the same benchmark source across mock cards, result reports, and leaderboards so all counters stay consistent.
- Record the real-cohort scoring rule in the project architecture notes and verify desktop/mobile rendering plus the current build.
