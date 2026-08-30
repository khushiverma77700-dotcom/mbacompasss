ALTER TABLE public.seo_intel_jobs ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.seo_intel_settings ADD COLUMN IF NOT EXISTS autonomous_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.seo_intel_keywords ADD COLUMN IF NOT EXISTS discovered_from text;
ALTER TABLE public.seo_intel_keywords ADD COLUMN IF NOT EXISTS discovery_source text;