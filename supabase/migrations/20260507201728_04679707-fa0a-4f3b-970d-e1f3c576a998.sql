
CREATE TABLE public.cta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cta_key TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('login_prompted','executed')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cta_events_key_idx ON public.cta_events(cta_key);
CREATE INDEX cta_events_created_idx ON public.cta_events(created_at DESC);

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert cta event"
  ON public.cta_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins can read cta events"
  ON public.cta_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
