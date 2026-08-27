ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS listing_sort_order integer;
ALTER TABLE public.exam_generation_jobs ADD COLUMN IF NOT EXISTS sort_order integer;
CREATE INDEX IF NOT EXISTS exams_listing_sort_order_idx ON public.exams (listing_sort_order NULLS LAST);