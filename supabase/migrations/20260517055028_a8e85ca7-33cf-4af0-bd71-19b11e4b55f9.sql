
ALTER TABLE public.colleges    ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.articles    ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.institutes  ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.exams       ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.city_pages  ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.categories  ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.ctr_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  page_type text,
  table_name text,
  slug text,
  action text NOT NULL,
  old_title text,
  new_title text,
  old_description text,
  new_description text,
  payload jsonb DEFAULT '{}'::jsonb,
  applied_by uuid,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ctr_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ctr_optimizations"
ON public.ctr_optimizations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert ctr_optimizations"
ON public.ctr_optimizations FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ctr_optimizations"
ON public.ctr_optimizations FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ctr_optimizations"
ON public.ctr_optimizations FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ctr_optimizations_url ON public.ctr_optimizations(page_url);
CREATE INDEX IF NOT EXISTS idx_ctr_optimizations_applied_at ON public.ctr_optimizations(applied_at DESC);
