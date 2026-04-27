---
name: Personalized Mock Hub
description: Student-facing /student/personalized-hub generates custom AI-powered mocks (CAT/NMAT/XAT/SNAP/IIFT/CMAT/MAT) with no-repeat per-user; admin manages bank + access at /admin/personalized-hub
type: feature
---

- Student route: `/student/personalized-hub` → wizard (exam → sections → difficulty → count). Duration auto = 1 min/question.
- Runner: `/student/personalized-hub/attempt/:id`. Result: `/student/personalized-hub/result/:id`.
- Admin route: `/admin/personalized-hub` (Bank counts / Bulk Generate / Access Grants).
- Tables: `personalized_questions` (AI MCQ bank), `personalized_question_seen` (no-repeat per user), `personalized_mock_attempts`, `personalized_hub_access` (daily_quota + expires_at).
- Edge functions: `personalized-questions-generate` (admin-only, uses **OpenAI gpt-4o** via `OPENAI_API_KEY`, tool-calling for structured output, max 25/batch), `personalized-mock-create` (picks fresh questions via `pick_personalized_questions` RPC, enforces daily quota), `personalized-mock-submit` (scores +3/-1 with explanations).
- Access model: admin-grant only (default 5/day × 30 days). No auto-grant on Razorpay yet.
- Exam catalog: `src/data/personalizedExams.ts`.
- Scoring: +3 correct, -1 wrong, 0 skip. Accuracy = correct/(correct+wrong).
