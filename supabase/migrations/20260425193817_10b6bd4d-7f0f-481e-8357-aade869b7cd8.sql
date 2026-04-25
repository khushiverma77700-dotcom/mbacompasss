ALTER TABLE public.bulk_college_jobs
  ADD COLUMN IF NOT EXISTS ai_provider text NOT NULL DEFAULT 'gemini'
  CHECK (ai_provider IN ('gemini','lovable'));

ALTER TABLE public.bulk_section_jobs
  ADD COLUMN IF NOT EXISTS ai_provider text NOT NULL DEFAULT 'gemini'
  CHECK (ai_provider IN ('gemini','lovable'));