CREATE TABLE public.sitemap_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sitemap_url text NOT NULL,
  submitted_on date NOT NULL,
  url_count integer,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sitemap_url, submitted_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitemap_submissions TO authenticated;
GRANT ALL ON public.sitemap_submissions TO service_role;
ALTER TABLE public.sitemap_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sitemap submissions" ON public.sitemap_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));