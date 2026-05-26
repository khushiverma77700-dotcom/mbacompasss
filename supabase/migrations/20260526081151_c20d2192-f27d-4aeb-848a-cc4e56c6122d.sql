ALTER TABLE public.mock_bundles
  ADD COLUMN IF NOT EXISTS filter_exams text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS filter_types text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_mock_bundles_filter_exams ON public.mock_bundles USING GIN (filter_exams);
CREATE INDEX IF NOT EXISTS idx_mock_bundles_filter_types ON public.mock_bundles USING GIN (filter_types);