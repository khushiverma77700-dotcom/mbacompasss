ALTER TABLE public.vocab_generation_jobs ADD COLUMN IF NOT EXISTS worker_heartbeat TIMESTAMPTZ;
-- Reset the 15-day stuck job and the two paused ones so the admin can restart cleanly
UPDATE public.vocab_generation_jobs
SET status = 'paused',
    worker_heartbeat = NULL,
    current_activity = 'Stopped — worker was stuck. Click Resume to continue with the new safer loop.'
WHERE status = 'running' AND (worker_heartbeat IS NULL OR worker_heartbeat < NOW() - INTERVAL '5 minutes');