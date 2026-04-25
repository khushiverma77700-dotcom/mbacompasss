ALTER TABLE public.bulk_college_jobs
ADD COLUMN IF NOT EXISTS request_inputs JSONB NOT NULL DEFAULT '{}'::jsonb;