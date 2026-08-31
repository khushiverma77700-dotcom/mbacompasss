ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS listing_sort_order integer;
CREATE INDEX IF NOT EXISTS idx_institutes_listing_sort_order ON public.institutes (listing_sort_order NULLS LAST);