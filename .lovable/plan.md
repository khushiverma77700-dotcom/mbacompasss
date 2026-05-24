
# Quant Formula Book — MVP Plan

A new feature mirroring the architecture of the existing B-School Vocabulary hub: public SEO formula pages + a logged-in student revision dashboard + admin CRUD with AI generation. Powered by OpenAI gpt-5-mini through the Lovable AI Gateway.

## What ships in v1

- Public, indexable formula pages at `/formula/:slug` for SEO traffic
- A public directory landing at `/formulas`
- Student revision dashboard at `/student/formulas` (new sidebar item right under B-School Vocabulary)
- Smart instant search with topic / exam / difficulty / status filters that apply while typing
- Per-formula detail with explanation, derivation, shortcuts, common mistakes, examples, related formulas
- AI "Explain simpler", "Generate practice question", and step-by-step solution
- Daily Revision mode (10 formulas/day, streak, completion %, weak-formula resurfacing)
- Bookmark / Mark Completed / Mark for Revision / progress tracking
- Admin CRUD + bulk AI seed (~150 starter formulas) + per-topic bulk-generate (mirrors vocab pattern)

Deferred to v2: SM-2 spaced repetition tuning, retention scoring, custom revision lists, leaderboard, deep analytics dashboards.

## Information architecture

```text
Public
  /formulas                       directory + smart search
  /formula/:slug                  SEO-optimized formula detail

Student (auth)
  /student/formulas               revision dashboard (hero, daily mode, search, filters)
  /student/formulas/topic/:topic  topic-scoped revision
  /student/formulas/daily         today's revision set
  /student/formulas/practice/:id  AI practice mode for one formula
  /student/formulas/bookmarks     saved + revision-later
  /student/formulas/progress      mastery + analytics (light)

Admin
  /admin/formulas                 list + filters + bulk AI seed + per-topic generate
  /admin/formulas/new             create
  /admin/formulas/:id             edit
```

## Database schema (new tables)

- `quant_topics` — id, name, slug, parent_slug (e.g. arithmetic > percentages), sort_order, icon, color, weightage
- `quant_formulas` — id, slug, name, expression (LaTeX/plain), explanation, derivation, shortcuts[], notes, common_mistakes[], related_slugs[], topic_slug, difficulty (beginner|intermediate|cat|advanced), exam_tags[] (CAT, XAT, NMAT, SNAP, CMAT, IIFT, MAT), importance (1–5), is_shortcut bool, is_high_weightage bool, frequency_score int, examples jsonb, seo_title, seo_description, seo_keywords[], faqs jsonb, published bool, created_at, updated_at
- `quant_formula_progress` — user_id, formula_id, status (none|completed|revise_later|mastered), bookmarked bool, times_revised int, last_revised_at, next_review_at, accuracy_pct, updated_at
- `quant_revision_sessions` — user_id, session_date, formula_ids[], completed_ids[], duration_seconds, streak_day
- `quant_streaks` — user_id, current_streak, longest_streak, last_active_date, total_xp, daily_target_formulas (default 10)
- `quant_practice_attempts` — id, user_id, formula_id, question_text, options jsonb, correct_index, user_answer_index, is_correct, ai_explanation, created_at

RLS: formulas/topics public read; progress/sessions/streaks/attempts owner-only; admin via `has_role('admin')` for writes.

## Edge functions

- `formula-search` — fast typeahead. Accepts `q`, returns matched formulas + related topics + AI-suggested concept chips. AI call only when `q` length ≥ 3 and no exact DB match.
- `formula-ai-assist` — modes: `explain_simpler`, `derive_step`, `shortcut_tip`, `worked_example`. Streams response.
- `formula-practice-generate` — generates 1 practice question (easy/medium/hard) with 4 options + step-by-step solution as JSON via tool calling.
- `formula-daily-set` — picks today's 10 formulas: weak (low accuracy) + due-for-review + high-weightage backfill. Idempotent per day.
- `formula-bulk-seed` — admin only; queues batch generation of ~150 formulas across listed topics using gpt-5-mini, mirroring `vocab-bulk-generate` worker-slice pattern.
- `formula-topic-generate` — admin generates N formulas for a chosen topic on demand.

All functions use `LOVABLE_API_KEY` against `ai.gateway.lovable.dev` with model `openai/gpt-5-mini`. CORS enabled. `logAIUsage` called after each completion (per project memory).

## Student dashboard layout

- Hero: greeting + Level/XP + daily streak + daily target ring (mirrors vocab feed style)
- Today's Daily Revision card (10 formulas, progress bar, "Start revision")
- Smart search bar (debounced 200ms, instant chip suggestions)
- Filter row: Topic, Exam, Difficulty, Importance, Status (Completed / Pending / Bookmarked / Revision Required), "Most Important", "Shortcut Only"
- Topic grid (cards with icon, weightage, completion %)
- Bookmarked / Recently revised rails
- AI assist button per formula card → opens drawer with explain / shortcut / practice tabs

## Public SEO

- `/formula/:slug` — server-renderable structured page: H1 = formula name, expression in math block, explanation, derivation, shortcuts, exam tags, FAQs (JSON-LD `FAQPage`), related formulas. Canonical, OG, JSON-LD `LearningResource`.
- Auto-enqueue to `indexing_urls` via existing trigger pattern.
- Sitemap entry source via existing sitemap edge function.

## Admin panel

- `/admin/formulas` list (search, topic/exam/difficulty/status filters, paginated)
- Create/Edit form with all fields, LaTeX preview, FAQ editor, examples editor
- Bulk seed button → background worker; live progress (reuse pattern from `vocab-bulk-generate` with attempts/cost/throughput display)
- Per-topic "Generate N formulas" action
- Sidebar nav item right under "Vocabulary Hub"

## Frontend wiring

- Add route entries in `src/App.tsx` (lazy)
- Add `/student/formulas` nav item in `StudentLayout.tsx` directly below the vocabulary item; feature flag `formula_book`
- Add `formula_book` to `courseFeatures` defaults so it's available to all students (no paywall in v1)
- Mirror styling of `StudentVocabularyFeed.tsx` (white + light-blue palette per project memory; no dark navy; pointer-events-none on decorative overlays)

## Seed strategy

- One-time seed script (using AI Gateway skill) generates ~150 high-quality formulas across listed topics on first deploy
- Admin can keep adding via bulk-generate or one-off CRUD afterwards

## Technical notes

- Math rendering: use `katex` (small, mature) for expression display
- Search: client debounce + Postgres trigram/`ilike` for instant DB hits; AI suggestion only on miss
- Daily set: cron at 04:00 IST regenerates `quant_daily_picks` materialized list (optional v1; on-demand compute works fine for v1)
- All AI prompts kept server-side per platform rules; never expose model name to client UI

## Out of scope for v1

- Full SM-2 spaced repetition tuning (basic next_review_at bump only)
- Retention score, mastery analytics dashboards beyond simple counts
- Custom user-defined revision lists
- Public leaderboard for formulas
- Paywall / feature-gating beyond defaults
