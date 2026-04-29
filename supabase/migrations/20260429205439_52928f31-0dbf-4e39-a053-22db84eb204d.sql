UPDATE public.mock_section_jobs
SET status = 'pending',
    worker_lock_until = NULL,
    current_step = 'manual: requeued after fix deploy',
    updated_at = now()
WHERE id IN ('1e6ed1b9-7e18-4ff9-a312-cb56d7b02735', 'e0c6b0b8-b8eb-42f7-b437-033adf06c073');

UPDATE public.ai_mock_generations
SET status = 'running', error_message = NULL, finished_at = NULL
WHERE id = '51a459ea-92f0-4e86-90b3-8e1fabbac877';