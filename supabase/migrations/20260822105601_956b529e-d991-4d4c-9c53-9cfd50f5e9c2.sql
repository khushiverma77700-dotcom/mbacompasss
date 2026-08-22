CREATE TABLE public.guidance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  graduation_year TEXT,
  exam TEXT,
  score TEXT,
  work_experience TEXT,
  specialisation TEXT,
  help_topics TEXT[] NOT NULL DEFAULT '{}',
  query TEXT,
  source TEXT NOT NULL DEFAULT 'contact_page',
  status TEXT NOT NULL DEFAULT 'new',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.guidance_requests TO anon;
GRANT INSERT, SELECT ON public.guidance_requests TO authenticated;
GRANT ALL ON public.guidance_requests TO service_role;

ALTER TABLE public.guidance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a guidance request"
ON public.guidance_requests FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view guidance requests"
ON public.guidance_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update guidance requests"
ON public.guidance_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete guidance requests"
ON public.guidance_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_guidance_requests_created_at ON public.guidance_requests (created_at DESC);