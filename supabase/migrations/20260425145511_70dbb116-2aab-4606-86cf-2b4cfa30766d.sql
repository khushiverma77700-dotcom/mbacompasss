ALTER TABLE public.bulk_college_jobs
ADD COLUMN IF NOT EXISTS telemetry jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS worker_lock_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS worker_id text;

ALTER TABLE public.bulk_section_jobs
ADD COLUMN IF NOT EXISTS telemetry jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS worker_lock_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS worker_id text;

CREATE INDEX IF NOT EXISTS idx_bulk_college_jobs_worker_lock
ON public.bulk_college_jobs (status, paused, worker_lock_until);

CREATE INDEX IF NOT EXISTS idx_bulk_section_jobs_worker_lock
ON public.bulk_section_jobs (status, paused, worker_lock_until);