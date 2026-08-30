ALTER TABLE public.seo_intel_pages
  ADD COLUMN IF NOT EXISTS last_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_round integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS discovered_by text;

CREATE INDEX IF NOT EXISTS seo_intel_pages_rotation_idx
  ON public.seo_intel_pages (last_analyzed_at NULLS FIRST, impressions DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS seo_intel_pages_first_seen_idx
  ON public.seo_intel_pages (first_seen_at DESC);