ALTER TABLE public.ad_settings
  ADD COLUMN IF NOT EXISTS ads_per_1000_words numeric NOT NULL DEFAULT 1.2,
  ADD COLUMN IF NOT EXISTS length_tiers jsonb NOT NULL DEFAULT '[{"max_words":500,"ads":1},{"max_words":1000,"ads":2},{"max_words":2000,"ads":3},{"max_words":3500,"ads":4},{"max_words":999999,"ads":5}]'::jsonb,
  ADD COLUMN IF NOT EXISTS sidebar_stack_size integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS sidebar_gap_px integer NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS sidebar_sticky boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS homepage_section_ads integer NOT NULL DEFAULT 2;