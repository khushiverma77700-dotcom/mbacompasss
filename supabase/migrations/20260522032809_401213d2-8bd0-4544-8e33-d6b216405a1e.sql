ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS topic text;
CREATE INDEX IF NOT EXISTS idx_mock_tests_topic ON public.mock_tests (topic) WHERE topic IS NOT NULL;