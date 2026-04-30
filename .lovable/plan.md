# CAT Mock Platform — Bug Fix Plan

Ten separate issues. I'll address each in scope, frontend-first where possible, touching AI generation only where the bug is server-side.

## 1. VARC: 4–5 questions per passage, one passage at a time
- **Generation fix** (`generate-mock-questions/index.ts`): enforce in the VARC prompt + post-validation that each RC passage has min 4 / max 5 questions. Reject and re-bucket if a passage exceeds 5.
- **Runner fix** (`MockTestRunnerPage.tsx`): show only the *current question's passage*, never stack multiple passages. Already keyed by `currentQuestion.passage_id` — verify no list rendering of all passages and remove any that exists.

## 2. Remove the duplicate "Submit Now" button
- In `MockTestRunnerPage.tsx`, locate the top-bar "Submit" button and remove it. Keep only the bottom "Submit Test" button.

## 3. On-screen calculator in DILR + Quant
- `MockCalculator` already exists and is mounted in the top header for all sections.
- Change: only show calculator button when `currentSection.code` ∈ {`DILR`, `QA`} (CAT rule — VARC has no calculator). Ensure it's visible for both MCQ and TITA Quant questions (no conditional hiding by question type).

## 4. Math rendering + DI-LR visuals
- `MathContent.tsx` uses KaTeX already. Issues:
  - Add support for `\(...\)` and `\[...\]` LaTeX delimiters (some AI output uses these).
  - Improve regex to not break on `$` used as currency.
  - Apply `MathContent` to **options** too (not just questions) — currently options may render raw HTML.
- DI-LR visuals: update generation prompt to instruct AI to emit clean SVG `<svg>` tables/charts instead of base64 images. Add SVG to DOMPurify allow-list in `MathContent`.

## 5. Upgrade question difficulty
- In `generate-mock-questions/index.ts`, change difficulty distribution prompts:
  - VARC: 30% easy / 45% medium / 25% hard
  - DILR: 20% easy / 40% medium / 40% hard
  - QA: 25% easy / 40% medium / 35% hard
- Add explicit CAT-level reference (CAT 2022–2024 difficulty band) and ban "trivial arithmetic" patterns.

## 6. Remove "Regenerate" from AI analysis report
- Locate the regenerate button in `student-mock-deep-analysis` UI (likely `StudentDeepAnalysis.tsx` / `MockResultPage.tsx`). Remove the button + handler. Report stays static after first generation.

## 7. Disable AI pop-ups during test + dashboard
- Audit any `<Dialog>` / `toast` AI-suggestion triggers inside `StudentLayout.tsx`, `StudentOverview.tsx`, `MockTestRunnerPage.tsx` (e.g. ProfileAnalyzerPopup, AI insight dialog auto-open). Gate them with a guard that returns null on `/student/*` and `/mocks/test/*` routes.

## 8. Dashboard isolation — back button + logout
- `StudentLayout.tsx`: intercept browser back. If user tries to navigate outside `/student/*`, push them back to `/student`.
- Logout handler: redirect to `/student/login` (currently goes to `/`).

## 9. Calculator alongside TITA in Quant
- Same as #3 — ensure calculator button is in the persistent header, not inside the MCQ-only render path.

## 10. Performance overview — broken code rendering
- In `StudentPerformance.tsx` / `useStudentPerformance.ts`, locate places where raw HTML or `null`/`undefined` strings render. Likely culprits:
  - Avg score showing `NaN%` when no attempts → guard with `Number.isFinite` and show `—`.
  - Section-wise metrics rendering raw `${...}` template strings or unparsed JSON. Replace with proper formatted numbers / `MathContent` where needed.

---

## Technical execution order

1. Frontend quick wins (no AI roundtrip): #2, #3, #6, #7, #8, #9, #10, plus runner-side of #1 and #4.
2. Edge function changes: #1 generation enforcement, #4 SVG instructions, #5 difficulty bump in `generate-mock-questions/index.ts`.

Each issue is independent and can be reverted individually if needed. No DB migrations required.

---

## Files I'll touch (estimated)

- `src/pages/mocks/MockTestRunnerPage.tsx` — #1 (passage isolation), #2 (remove top submit), #3/#9 (calculator gating)
- `src/components/mock/MathContent.tsx` — #4 (delimiters, SVG)
- `src/pages/mocks/MockResultPage.tsx` or `src/pages/student/StudentDeepAnalysis.tsx` — #6
- `src/pages/student/StudentLayout.tsx` — #7 (popup gate), #8 (back + logout)
- `src/pages/student/StudentOverview.tsx` — #7
- `src/pages/student/StudentPerformance.tsx` + `src/hooks/useStudentPerformance.ts` — #10
- `supabase/functions/generate-mock-questions/index.ts` — #1, #4, #5

Confirm and I'll start implementing. If you want to drop or reorder any item, tell me now.
