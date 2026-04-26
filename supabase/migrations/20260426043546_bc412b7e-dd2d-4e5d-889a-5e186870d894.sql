ALTER TABLE public.bulk_section_jobs DROP CONSTRAINT IF EXISTS bulk_section_jobs_ai_provider_check;
ALTER TABLE public.bulk_section_jobs ADD CONSTRAINT bulk_section_jobs_ai_provider_check CHECK (ai_provider IN ('gemini','gemini-lite','lovable','openai-mini','openai-nano'));

ALTER TABLE public.bulk_college_jobs DROP CONSTRAINT IF EXISTS bulk_college_jobs_ai_provider_check;
ALTER TABLE public.bulk_college_jobs ADD CONSTRAINT bulk_college_jobs_ai_provider_check CHECK (ai_provider IN ('gemini','gemini-lite','lovable','openai-mini','openai-nano'));