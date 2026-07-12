ALTER TABLE public.freebies
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_freebies_featured ON public.freebies (is_featured, featured_order);