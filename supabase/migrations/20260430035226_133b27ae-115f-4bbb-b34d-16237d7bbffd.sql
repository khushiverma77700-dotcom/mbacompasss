ALTER TABLE public.mock_section_jobs
  ADD COLUMN IF NOT EXISTS sets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_per_set integer NOT NULL DEFAULT 0;