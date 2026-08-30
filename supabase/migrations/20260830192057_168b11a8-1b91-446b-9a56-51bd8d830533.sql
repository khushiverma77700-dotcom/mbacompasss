ALTER TABLE public.seo_intel_pages
  ADD COLUMN IF NOT EXISTS aeo_score integer,
  ADD COLUMN IF NOT EXISTS aeo_grade text,
  ADD COLUMN IF NOT EXISTS aeo_failed jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS aeo_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS seo_intel_pages_aeo_score_idx
  ON public.seo_intel_pages (aeo_score NULLS FIRST);