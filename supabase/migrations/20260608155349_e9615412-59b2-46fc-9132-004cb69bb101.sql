UPDATE public.vocab_generation_jobs
SET status='paused', worker_heartbeat=NULL,
    current_activity='Stopped — restart with the fixed worker.'
WHERE id='15b3c627-584a-4d6c-b227-11b4b1ecfd28';