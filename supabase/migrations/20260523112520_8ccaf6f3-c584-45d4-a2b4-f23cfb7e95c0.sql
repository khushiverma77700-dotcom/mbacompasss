
-- Mark long-abandoned pending/processing section jobs as failed (>30 min idle)
UPDATE public.mock_section_jobs
SET status = 'failed',
    current_step = 'Auto-failed by cleanup — job was abandoned (rate-limited / no progress for >30 min).',
    error_message = COALESCE(NULLIF(error_message, ''), 'Auto-failed: job idle for more than 30 minutes.'),
    final_reason = 'auto_failed_stale',
    updated_at = now()
WHERE status IN ('pending', 'processing')
  AND updated_at < now() - interval '30 minutes';

-- Mark parent generations that are running but have no live work as failed
UPDATE public.ai_mock_generations g
SET status = 'failed',
    error_message = COALESCE(NULLIF(error_message, ''), 'Auto-failed: no active section jobs remaining and idle > 30 min.'),
    finished_at = now()
WHERE g.status = 'running'
  AND g.created_at < now() - interval '30 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM public.mock_section_jobs j
    WHERE j.generation_id = g.id
      AND j.status IN ('pending', 'processing')
      AND j.updated_at > now() - interval '30 minutes'
  );
