ALTER TABLE public.bulk_college_jobs
  ADD COLUMN IF NOT EXISTS concurrency integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

ALTER TABLE public.bulk_section_jobs
  ADD COLUMN IF NOT EXISTS concurrency integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

ALTER TABLE public.bulk_college_jobs
  DROP CONSTRAINT IF EXISTS bulk_college_jobs_concurrency_check;
ALTER TABLE public.bulk_college_jobs
  ADD CONSTRAINT bulk_college_jobs_concurrency_check CHECK (concurrency BETWEEN 1 AND 10);

ALTER TABLE public.bulk_section_jobs
  DROP CONSTRAINT IF EXISTS bulk_section_jobs_concurrency_check;
ALTER TABLE public.bulk_section_jobs
  ADD CONSTRAINT bulk_section_jobs_concurrency_check CHECK (concurrency BETWEEN 1 AND 10);