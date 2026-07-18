
CREATE TABLE public.landscape_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('iim','private','govt','global')),
  rank INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  city TEXT,
  fees TEXT,
  cutoff TEXT,
  average_package TEXT,
  highest_package TEXT,
  highlight TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landscape_colleges_cat ON public.landscape_colleges(category, sort_order, rank);

GRANT SELECT ON public.landscape_colleges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.landscape_colleges TO authenticated;
GRANT ALL ON public.landscape_colleges TO service_role;

ALTER TABLE public.landscape_colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active landscape colleges"
  ON public.landscape_colleges FOR SELECT
  USING (is_active = true OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins manage landscape colleges"
  ON public.landscape_colleges FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_landscape_colleges_updated_at
  BEFORE UPDATE ON public.landscape_colleges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
