ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS mock_tests_sort_order_idx ON public.mock_tests (sort_order);