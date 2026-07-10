
CREATE TABLE public.official_source_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('college','institute','course','article','exam','global')),
  domain TEXT NOT NULL,
  label TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_type, domain)
);

GRANT SELECT ON public.official_source_domains TO anon, authenticated;
GRANT ALL ON public.official_source_domains TO service_role;

ALTER TABLE public.official_source_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active source domains"
  ON public.official_source_domains FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert source domains"
  ON public.official_source_domains FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update source domains"
  ON public.official_source_domains FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete source domains"
  ON public.official_source_domains FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_official_source_domains_updated_at
  BEFORE UPDATE ON public.official_source_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with the domains already hard-coded in the refresh-content prompt
INSERT INTO public.official_source_domains (content_type, domain, label) VALUES
  ('global',    'nirfindia.org',                'NIRF Rankings (MoE)'),
  ('global',    'aicte-india.org',              'AICTE (Regulator)'),
  ('global',    'naac.gov.in',                  'NAAC (Accreditation)'),
  ('global',    'ugc.gov.in',                   'UGC (Regulator)'),
  ('exam',      'iimcat.ac.in',                 'CAT official'),
  ('exam',      'xatonline.in',                 'XAT official'),
  ('exam',      'nmat.org',                     'NMAT official'),
  ('exam',      'snaptest.org',                 'SNAP official'),
  ('exam',      'iift.nta.nic.in',              'IIFT official'),
  ('exam',      'cmat.nta.nic.in',              'CMAT official'),
  ('exam',      'mat.aima.in',                  'MAT official'),
  ('exam',      'mba.com',                      'GMAT official'),
  ('exam',      'ets.org',                      'GRE official')
ON CONFLICT (content_type, domain) DO NOTHING;
