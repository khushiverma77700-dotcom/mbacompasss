UPDATE public.ai_mock_generations
SET status = 'failed',
    error_message = COALESCE(error_message, 'Auto-cleanup: stuck job exceeded 10 minutes'),
    finished_at = now()
WHERE status = 'running'
  AND created_at < now() - interval '10 minutes';