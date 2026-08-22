ALTER TABLE public.guidance_requests
  ADD COLUMN IF NOT EXISTS lead_stage TEXT NOT NULL DEFAULT 'not_contacted',
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_guidance_requests_lead_stage ON public.guidance_requests (lead_stage);

CREATE TABLE IF NOT EXISTS public.guidance_request_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.guidance_requests(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  stage_at_note TEXT,
  created_by UUID,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_request_notes TO authenticated;
GRANT ALL ON public.guidance_request_notes TO service_role;

ALTER TABLE public.guidance_request_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view guidance notes"
ON public.guidance_request_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add guidance notes"
ON public.guidance_request_notes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update guidance notes"
ON public.guidance_request_notes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete guidance notes"
ON public.guidance_request_notes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_guidance_request_notes_request ON public.guidance_request_notes (request_id, created_at DESC);