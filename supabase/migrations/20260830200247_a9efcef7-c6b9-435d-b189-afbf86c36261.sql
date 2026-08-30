CREATE INDEX IF NOT EXISTS idx_site_settings_key_pattern
  ON public.site_settings (key text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_colleges_ranking
  ON public.colleges (ranking NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_seo_intel_page_history_captured
  ON public.seo_intel_page_history (captured_on);

ANALYZE public.site_settings;
ANALYZE public.colleges;
ANALYZE public.articles;