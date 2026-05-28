-- Targeted indexes for AI mock-generation queues and progress polling.
CREATE INDEX IF NOT EXISTS idx_bmri_created_by_recent
ON public.bulk_mock_requests (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bmri_items_request_created
ON public.bulk_mock_request_items (request_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bmri_items_processing_generation
ON public.bulk_mock_request_items (started_at, created_at, generation_id)
WHERE paused = false AND status = 'processing' AND generation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bmri_items_pending_dispatch
ON public.bulk_mock_request_items (created_at, worker_lock_until)
WHERE paused = false AND generation_id IS NULL AND status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_mock_section_jobs_generation_created
ON public.mock_section_jobs (generation_id, created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mock_section_jobs_generation_worker_lock
ON public.mock_section_jobs (generation_id, worker_lock_until)
WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_mock_section_jobs_updated_status_attempts
ON public.mock_section_jobs (updated_at DESC, status, attempts);

CREATE INDEX IF NOT EXISTS idx_mock_questions_section_question_desc
ON public.mock_questions (section_id, question_number DESC);

-- Reduce recurring background refresh work. Rankings remain fresh enough without a 5-minute refresh loop.
SELECT cron.schedule('refresh-leaderboard-caches', '*/30 * * * *', 'SELECT public.refresh_leaderboard_caches();');

ANALYZE public.bulk_mock_requests;
ANALYZE public.bulk_mock_request_items;
ANALYZE public.mock_section_jobs;
ANALYZE public.mock_questions;