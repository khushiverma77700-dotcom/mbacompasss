CREATE TABLE public.freebies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  download_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.freebies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freebies TO authenticated;
GRANT ALL ON public.freebies TO service_role;

ALTER TABLE public.freebies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published freebies"
  ON public.freebies FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert freebies"
  ON public.freebies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update freebies"
  ON public.freebies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete freebies"
  ON public.freebies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_freebies_updated_at
  BEFORE UPDATE ON public.freebies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_freebies_published ON public.freebies(is_published, sort_order DESC, created_at DESC);
CREATE INDEX idx_freebies_category ON public.freebies(category);