## Goal

Deliver a deeply detailed, **100% system-generated** mock report covering all 10 sections you listed. AI analysis becomes **opt-in** (button click only). **Daily Tests** remain AI-free.

## Scope

Rebuild the report UI for:
1. **Full-length & sectional mocks** → `MockResultPage` (`/mocks/result/:attemptId`)
2. **Personalized hub mocks** → `PersonalizedMockResultPage` (`/student/personalized/result/:attemptId`)
3. **Daily Test report** → `StudentDailyTestReportPage` — keep system-only; remove any AI link/CTA.

No backend or schema changes. AI uses existing `generate-mock-insights` and `student-mock-deep-analysis` edge functions, but only when the user clicks **"Run AI Analysis"**.

## The 10 report sections (built from existing data)

Built using `mock_attempts`, `mock_responses`, `mock_questions`, `mock_question_options`, `mock_sections` — all already loaded.

| # | Section | Components / Charts |
|---|---|---|
| 1 | **Overall Performance Summary** | KPI cards: Total Score, Percentile, Accuracy, Attempted/Total, Time Utilization. Percentile gauge. |
| 2 | **Performance Comparison** | Grouped bar (You vs Avg vs Top 10% vs Topper). Accuracy-vs-Attempts scatter. Percentile distribution histogram with "you" highlighted. |
| 3 | **Section-Wise Analysis** | Expandable card per section: score bar, accuracy donut, time-spent vs ideal-time bar, attempts/correct/incorrect. |
| 4 | **Question-Level Analysis** | Filterable table (Correct/Incorrect/Skipped × Easy/Med/Hard). Outcome pie. Difficulty-attempt distribution. Tags: silly mistake (correct topic but wrong & <30s), conceptual (wrong & >ideal time), missed easy (skipped easy Qs). |
| 5 | **Time Management** | Stacked bar — time per section. Per-question time histogram. Speed-vs-accuracy line (rolling). |
| 6 | **Attempt Strategy** | Classifier → Aggressive / Balanced / Conservative based on (attempts/total) & accuracy. Quadrant chart (attempts vs accuracy). |
| 7 | **Difficulty Analysis** | Difficulty-wise accuracy bar, attempts distribution. Insight tags ("Weak in Easy", "Strong in Hard"). |
| 8 | **Peer Benchmarking** | You vs Top 10% vs Avg comparison bars + score-gap bar. |
| 9 | **Strengths & Weaknesses** | 2-column layout + topic mastery heatmap. |
| 10 | **Progress Tracking** | If ≥2 attempts on same exam_code: line charts for Score, Accuracy, Percentile across last 5 mocks. |

## AI Analysis (manual only)

- Remove the auto `useEffect → generateInsights()` in `MockResultPage`.
- Add a dedicated "🤖 Run AI Analysis" panel at the bottom with a single CTA button.
- On click → call `generate-mock-insights` (existing). Show loader, then render: AI summary, recommendations, priority weaknesses, 7-day study plan in a clean formatted block.
- Cache result in component state so re-clicks aren't needed in the same session.
- Daily Test report: remove any AI mentions/buttons (currently none, just verify).

## Personalized hub report

Upgrade `PersonalizedMockResultPage` to show sections 1, 3, 4, 5, 6, 7, 9 (skipping peer & progress where data is unavailable). Same manual AI button using `generate-mock-insights` (works on `mock_attempts` only — for personalized we'll do a lightweight inline rule-based summary instead, no AI dependency since attempts table is different).

## Reusable building blocks

Create small reusable components in `src/components/mock/report/`:
- `KPIGrid.tsx` — section 1 cards
- `ComparisonPanel.tsx` — section 2
- `SectionWiseCards.tsx` — section 3 (donut + bars)
- `QuestionLevelTable.tsx` — section 4 (filters + pie)
- `TimeManagementCharts.tsx` — section 5
- `StrategyClassifier.tsx` — section 6
- `DifficultyAnalysis.tsx` — section 7
- `PeerBenchmark.tsx` — section 8
- `StrengthsWeaknesses.tsx` — section 9 (incl. heatmap)
- `ProgressTrend.tsx` — section 10
- `AIAnalysisPanel.tsx` — manual-trigger AI block (used by both Mock + Personalized pages)

`MockResultPage` and `PersonalizedMockResultPage` become orchestrators that load data and render these blocks in order.

## Charts

Continue using `recharts` (already used). All colors via tailwind tokens / HSL. No emojis (per project rule).

## Files

**New**
- `src/components/mock/report/` (11 files above)

**Edited**
- `src/pages/mocks/MockResultPage.tsx` — refactor to use new blocks, remove auto-AI, add manual AI panel
- `src/pages/student/PersonalizedMockResultPage.tsx` — expand with system-generated sections + manual AI
- `src/pages/student/StudentDailyTestReportPage.tsx` — verify no AI hooks (likely no change; just confirm)

**Untouched**
- Edge functions, DB schema, daily-test logic, mock generation pipeline.

## Out of scope

- No new edge functions
- No DB migrations
- No changes to test runner / question generation
- Daily Test report stays as-is (system-only, no AI)

## QA

After build, navigate to a recent mock result and verify:
- All 10 sections render
- AI panel does not auto-fire (network logs)
- Clicking "Run AI Analysis" calls `generate-mock-insights`
- Daily test report has no AI button