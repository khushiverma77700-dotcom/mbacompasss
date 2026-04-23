-- Track AI content refresh proposals awaiting admin approval
CREATE TABLE public.content_refreshes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('article','college','institute','course')),
  entity_id UUID NOT NULL,
  entity_slug TEXT,
  entity_name TEXT,
  refresh_mode TEXT NOT NULL DEFAULT 'smart' CHECK (refresh_mode IN ('full','smart')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','failed','generating')),
  current_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposed_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_model TEXT,
  ai_notes TEXT,
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_refreshes_entity ON public.content_refreshes(entity_type, entity_id);
CREATE INDEX idx_content_refreshes_status ON public.content_refreshes(status);

ALTER TABLE public.content_refreshes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage content_refreshes"
ON public.content_refreshes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_content_refreshes_updated_at
BEFORE UPDATE ON public.content_refreshes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();