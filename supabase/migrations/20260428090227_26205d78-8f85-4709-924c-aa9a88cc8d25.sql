ALTER TABLE public.mock_bundles
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS included_categories text[] NOT NULL DEFAULT '{}';