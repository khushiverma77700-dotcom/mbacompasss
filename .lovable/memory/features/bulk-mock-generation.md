---
name: Bulk AI Mock Generation
description: Admin batch composer at /admin/bulk-mock-generation that queues many mock generation requests; bulk-mock-worker edge function dispatches each via generate-mock-questions and reconciles status from ai_mock_generations
type: feature
---
- Tables: `bulk_mock_requests` (parent batch) + `bulk_mock_request_items` (each queued mock with exam_code, category, level, section_code, topic, questions_per_set, sets, status, generation_id). Admin-only RLS via `has_role`.
- Edge function `bulk-mock-worker`:
  - With user JWT + `items` → creates batch, dispatches each in `EdgeRuntime.waitUntil` loop with 1.5s stagger by calling `generate-mock-questions`.
  - With `{ reconcile: true }` (cron-safe, no auth needed) → updates item status from `ai_mock_generations`.
  - With `{ resume_id }` → re-dispatches a single item.
- UI tabs: Queue Composer (add/edit/duplicate/delete drafts → Submit) + Generation Queue (live polling every 4s, reconcile every 6s; pause/resume/retry/delete actions).
- Statuses: pending, processing, completed, failed, needs_review (= some sections produced questions but generation marked failed).
- Reuses existing `generate-mock-questions` engine — no prompt or section-plan logic was duplicated.
