---
name: Student LMS Dashboard
description: /student LMS at /student. Overview with predictor/streak/heatmap, My Mocks categorized by status (Launched/Scheduled/Upcoming) and series (CAT/XAT/SNAP/NMAT/IIFT/CMAT/TISSNET), Buy Mocks at /student/buy-mocks, CAT Score Improvement Engine at /student/goals (study profile + AI plan via student-ai-insights edge function + today sprint + weak topic heatmap + custom goals)
type: feature
---
- Routes: /student (Overview), /student/mocks, /student/buy-mocks, /student/performance, /student/goals (CAT Score Engine), /student/announcements, /student/tools, /student/profile.
- Tables: student_study_profile (1 per user, ai_plan/ai_insights JSONB), student_daily_tasks (per-day), student_weak_topics (red/yellow/green heatmap). All RLS owner-only.
- AI: edge function `student-ai-insights` uses Lovable AI google/gemini-2.5-flash with response_format json_object; modes: "plan" (weekly_split, daily_template, focus_topics, predicted_percentile) and "insight" (insights[]).
- My Mocks tabs: Launched (is_live OR scheduled_start_at<=now), Scheduled (next 7d), Upcoming (>7d), plus per-series tabs filtered via exam_code/category. Empty bucket → CTA to /student/buy-mocks.
- Overview percentile predictor: weighted avg of last 5 attempts + small upward trend; displayed in radial chart. Today sprint seeds 4 standard CAT tasks (QA 20q, 2 RC, 1 LR set, sectional 40m).
- Admin assigns mocks at /admin/student-mocks; announcements at /admin/student-announcements.
