## Goal
Across all mock categories (Full Mock, Sectional, Topic, Daily, Personalized Hub), make sure **Question Number, Set Number, and Option Labels (A/B/C/D)** are always rendered by the UI as fixed/static elements — and the question text editor (and stored `question_html` / `option_html`) contains ONLY the pure question text and pure option text. No "Q1.", "Question 1:", "Set 1:", "(A)", "A.", "1)" etc. embedded anywhere.

## Where the problem lives today

1. **AI generator** (`supabase/functions/generate-mock-questions/index.ts`)
   - The prompt does not forbid embedding "Q1.", "Question 1:", "Set 1:", "(A)", "A." inside `question_html` / option text.
   - For DILR/VARC sets the prompt actually instructs duplicating the passage at the top of every question, but doesn't prevent the model from prefixing "Question 1 of Set 2" etc.

2. **CSV import & manual editor** (`src/pages/admin/AdminMockBuilder.tsx`)
   - Admins paste/write content that often starts with "Q1.", "1)", "Question:" and option text starting with "A) …".

3. **Runner / Review / Daily Test report** already render `question_number`, set badge, `option_label` from columns — so they double up with whatever is inside the HTML.

The UI side is already correct. The fix is **content hygiene**: enforce clean storage at write-time and clean legacy rows at read-time.

## Plan

### 1. AI prompt hardening (Full / Sectional / Topic / Daily / Personalized)
File: `supabase/functions/generate-mock-questions/index.ts`

- Add a hard rule block to `buildSystemPrompt`:
  - `question_html` must NOT begin with or contain any of: `Q1`, `Q.`, `Question 1`, `Question:`, `Q1.`, `1.`, `1)`, `(1)`, `Set 1`, `Set 1:`, `[Set …]`.
  - For set-bound questions, the passage/caselet stays inside `<div class="passage">` exactly as today, but no "Question 1 of Set 2" prefix anywhere.
  - `options[].text` must NOT start with `A)`, `A.`, `(A)`, `a)`, `1)`, etc. Just the pure option content.
- Update the JSON shape example in `buildUserPrompt` to show clean strings ("question_html: <p>Pure question only…</p>", "text: <p>Pure option only…</p>").

### 2. Server-side sanitizer before insert
Same file, in the section that maps the model's response into rows for `mock_questions` / `mock_question_options` / `personalized_questions` mirror.

Add a helper `stripQuestionPrefix(html)` and `stripOptionPrefix(html)` that removes:
- Leading `Q\s*\d+[.\):]?`
- Leading `Question\s*\d*[.:)]?`
- Leading `Set\s*\d+[:\-]?` (only if it's a stray prefix outside `<div class="passage">`)
- Leading numeric markers: `\d+[.\)]\s+`
- Leading option labels in `option_html`: `^\s*\(?[A-Da-d]\)?[.\):\-]\s+`

Apply to:
- `q.question_html` before insert into `mock_questions`
- `o.text` (becomes `option_html`) before insert into `mock_question_options`
- The mirrored `personalized_questions` rows (question_text and each option's text).

### 3. Same sanitizer in retry path
File: `supabase/functions/retry-mock-section/index.ts` — apply identical helpers when re-inserting questions/options after a section retry.

### 4. CSV import + manual editor sanitizer
File: `src/pages/admin/AdminMockBuilder.tsx`

- Add a small util `src/lib/cleanQuestionHtml.ts` exporting `stripQuestionPrefix` and `stripOptionPrefix` (same regexes as Edge Function, in TS).
- CSV import path: run sanitizer on each `question_html` and each option text before insert.
- Manual editor "Save" handler: run sanitizer on `editorState.question_html` and on every `editorState.options[i].option_html` right before insert/update.
- Optional: a small inline note under the question editor "Do not add Q1., Set, or option labels — they are added automatically."

### 5. One-time backfill migration (cleans existing rows)
New migration that runs the same regex cleanup in SQL on:
- `mock_questions.question_html`
- `mock_question_options.option_html`
- `personalized_questions.question_text`
- `personalized_questions.options` (jsonb — update each element's `text`)

Uses `regexp_replace` with the same patterns as the JS sanitizer, run once.

### 6. UI confirmation (no behavior change, just verify)
Confirm these already render the metadata as static UI (they do — listed for reference, no edits needed):
- `src/pages/mocks/MockTestRunnerPage.tsx` — shows `Question {n}`, set badge, `{o.option_label}.` prefix
- `src/pages/mocks/MockReviewPage.tsx` — same pattern
- `src/pages/student/StudentDailyTestReportPage.tsx` — same pattern
- `src/pages/student/PersonalizedHub*` — uses static A/B/C/D labels

If any of these still embed labels in markup duplicated from text, normalize during render.

## Files to change

```text
supabase/functions/generate-mock-questions/index.ts   (prompt + sanitize on insert + mirror)
supabase/functions/retry-mock-section/index.ts        (sanitize on retry insert + mirror)
src/lib/cleanQuestionHtml.ts                          (NEW shared util)
src/pages/admin/AdminMockBuilder.tsx                  (CSV import + manual save sanitize + helper note)
supabase/migrations/<new>.sql                         (one-time backfill cleanup)
```

## Out of scope
- No change to question_number / set_index columns.
- No change to runner/review UI logic; they already show metadata statically.
- No deletion of existing data — only in-place text cleanup.