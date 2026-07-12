
CREATE TABLE public.freebie_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  freebie_id UUID NOT NULL REFERENCES public.freebies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freebie_downloads_freebie ON public.freebie_downloads(freebie_id);
CREATE INDEX idx_freebie_downloads_user ON public.freebie_downloads(user_id);
CREATE INDEX idx_freebie_downloads_email ON public.freebie_downloads(lower(email));
CREATE INDEX idx_freebie_downloads_created ON public.freebie_downloads(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freebie_downloads TO authenticated;
GRANT SELECT, INSERT ON public.freebie_downloads TO anon;
GRANT ALL ON public.freebie_downloads TO service_role;

ALTER TABLE public.freebie_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a freebie download"
  ON public.freebie_downloads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all freebie downloads"
  ON public.freebie_downloads
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update freebie downloads"
  ON public.freebie_downloads
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete freebie downloads"
  ON public.freebie_downloads
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
