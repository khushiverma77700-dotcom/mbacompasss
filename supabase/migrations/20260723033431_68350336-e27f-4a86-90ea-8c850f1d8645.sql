ALTER TABLE public.seo_reoptimization_items
  ADD COLUMN IF NOT EXISTS long_tail_keywords jsonb,
  ADD COLUMN IF NOT EXISTS related_queries jsonb,
  ADD COLUMN IF NOT EXISTS keyword_density jsonb,
  ADD COLUMN IF NOT EXISTS full_content_before text,
  ADD COLUMN IF NOT EXISTS full_content_after text,
  ADD COLUMN IF NOT EXISTS content_word_count_before integer,
  ADD COLUMN IF NOT EXISTS content_word_count_after integer,
  ADD COLUMN IF NOT EXISTS aeo_notes text,
  ADD COLUMN IF NOT EXISTS geo_notes text,
  ADD COLUMN IF NOT EXISTS readability_score integer;

ALTER TABLE public.page_seo_overrides
  ADD COLUMN IF NOT EXISTS long_tail_keywords jsonb,
  ADD COLUMN IF NOT EXISTS related_queries jsonb,
  ADD COLUMN IF NOT EXISTS keyword_density jsonb,
  ADD COLUMN IF NOT EXISTS body_html text;