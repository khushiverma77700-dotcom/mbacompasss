
CREATE TABLE public.demo_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  source text DEFAULT 'demo_dashboard',
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_leads_created ON public.demo_leads(created_at DESC);
CREATE INDEX idx_demo_leads_user ON public.demo_leads(user_id);
CREATE UNIQUE INDEX uniq_demo_leads_user ON public.demo_leads(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_leads TO authenticated;
GRANT INSERT ON public.demo_leads TO anon;
GRANT ALL ON public.demo_leads TO service_role;

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert demo leads"
  ON public.demo_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view demo leads"
  ON public.demo_leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update demo leads"
  ON public.demo_leads FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete demo leads"
  ON public.demo_leads FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
