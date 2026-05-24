## B-School Vocabulary Hub — Implementation Plan

A new section in the student dashboard at `/student/vocabulary` that helps MBA aspirants build business vocabulary using AI (Lovable AI Gateway with `google/gemini-3-flash-preview`).

Stack stays on existing project: React + Vite + Supabase + Lovable AI (no MongoDB/Firebase/Next — we use what's already wired).

---

### 1. Database (Supabase migration)

New tables (all with RLS):

- `vocab_words` — id, word, part_of_speech, meaning, hinglish_meaning, pronunciation, synonyms[], antonyms[], example_sentences[] (business/interview/email), category (enum: finance, marketing, consulting, hr, economics, corp_comm), difficulty (beginner/intermediate/cat/gdpi), source ('seed'|'ai'), created_at. Public read; admin write.
- `vocab_word_of_day` — date (PK), word_id. Admin write, public read.
- `vocab_bookmarks` — user_id, word_id, note, created_at. Owner-only RLS.
- `vocab_progress` — user_id, word_id, mastery (0-5), times_seen, times_correct, last_seen_at, next_review_at (SM-2 spaced repetition). Owner-only.
- `vocab_quiz_attempts` — user_id, word_id, quiz_type (mcq/fill/synonym/correction/context), is_correct, time_taken_ms, created_at. Owner-only.
- `vocab_daily_goals` — user_id, date, words_target, words_done, quiz_target, quiz_done. Owner-only.
- `vocab_streaks` — user_id, current_streak, longest_streak, last_active_date, total_xp, badges jsonb. Owner-only.

DB function `vocab_due_for_review(_user_id, _limit)` returns words whose `next_review_at <= now()`.
DB function `award_vocab_xp(_user_id, _xp)` updates streak + XP atomically.
DB function `get_vocab_leaderboard(_limit)` ranked by `total_xp`.

### 2. Edge functions (Lovable AI)

- `vocab-explain` — input: word. Returns meaning, hinglish, 3 example sentences (business, interview, email), synonyms, antonyms. Caches into `vocab_words` if new.
- `vocab-quiz-generate` — input: word_ids, quiz_type. Returns AI-generated quiz items (MCQ/fill/correction/synonym/context) via tool-calling for structured output.
- `vocab-recommend` — input: user stats. Returns personalized daily list + weak-area focus.
- `vocab-search` — input: query. Looks up in `vocab_words`; if miss, calls AI to generate + saves.

All use `LOVABLE_API_KEY`, `google/gemini-3-flash-preview`, tool-calling for structured JSON, and return 429/402 errors clearly.

### 3. Student UI — `/student/vocabulary`

Routes under `StudentLayout`:

- `/student/vocabulary` — Hub overview
  - Word of the Day hero card (meaning + pronounce button via Web Speech API + bookmark)
  - Daily Challenge (5 due words) + Weekly Goal progress bar
  - Streak / XP / Level / Badges row
  - "Continue learning" cards (categories grid: Finance, Marketing, Consulting, HR, Economics, Corp Comm)
  - Difficulty tabs (Beginner / Intermediate / CAT / GDPI)
- `/student/vocabulary/feed` — Daily Vocabulary Feed (infinite scroll cards)
- `/student/vocabulary/word/:slug` — Word detail: meaning, hinglish toggle, pronunciation, synonyms/antonyms chips, AI sentence examples (Business/Interview/Email tabs), related words, bookmark.
- `/student/vocabulary/search` — Smart search bar; instant AI lookup for unknown words.
- `/student/vocabulary/bookmarks` — Saved words + revision deck mode (flashcards).
- `/student/vocabulary/quiz` — Daily Quiz runner (mixed types, timer, score, XP award).
- `/student/vocabulary/revision` — Spaced-repetition deck of due words.
- `/student/vocabulary/analytics` — Progress: words learned, accuracy, weak categories, streak heatmap, mastery distribution.
- `/student/vocabulary/leaderboard` — Top vocab learners by XP.

Add a "Vocabulary Hub" nav item in the student sidebar with a `BookOpen` icon and an "AI" badge.

### 4. Admin UI — `/admin/vocabulary`

- Words table (CRUD), CSV bulk-upload (500–1000 seed words), category/difficulty filters.
- Schedule Word of the Day (calendar picker).
- "AI Enrich" button — fills missing meaning/synonyms/examples via `vocab-explain`.
- Engagement analytics: DAU, words learned per user, quiz accuracy, top words.

Add nav entry in `adminNav.ts`.

### 5. Seed dataset

Ship `src/data/vocabSeed.ts` with ~150 starter MBA words across categories/difficulties; admin can bulk-upload the rest via CSV. Migration seeds the 150 on first run (idempotent insert by word).

### 6. Gamification

- XP: +5 per word marked known, +10 per quiz correct, −0 per wrong, daily-goal bonus +25.
- Streak: increments on any vocab activity that day; resets if missed.
- Badges: 7-day streak, 50/250/1000 words, 90% weekly accuracy, category master.
- Leaderboard reuses `student_rewards`-style pattern but scoped to vocab via `vocab_streaks`.

### 7. Spaced repetition

SM-2 lite: on each review, store `mastery`, compute `next_review_at = now() + interval` where interval doubles on correct (1d → 2d → 4d → 7d → 14d → 30d) and resets to 1d on wrong.

### 8. Design

- Match existing white / light-blue theme. Uses semantic tokens (`bg-card`, `text-foreground`, `primary`). No dark blue/navy. No emojis.
- Hero card: soft gradient with subtle decorative overlay (`pointer-events-none`).
- framer-motion fade/slide on cards.
- Mobile-first; cards stack; bottom-safe spacing for PWA.

### 9. Out of scope (this iteration)

- Push notifications for daily word (existing in-app `StudentNotifications` can be reused later).
- Voice answers / speech-to-text quizzes.

---

### Build order

1. Migration (tables + RLS + RPCs) + seed insert.
2. Edge functions (`vocab-explain`, `vocab-quiz-generate`, `vocab-search`, `vocab-recommend`).
3. Student hub overview + Word of the Day + nav entry.
4. Word detail + search + bookmarks.
5. Quiz runner + spaced-repetition revision.
6. Analytics + leaderboard + badges.
7. Admin words CRUD + CSV upload + WOTD scheduler + AI enrich.
8. QA pass on mobile + verify AI rate-limit handling.

Confirm and I'll start with the migration.