-- Phase B/C: Change-request workflow for user-managed listings
CREATE TABLE IF NOT EXISTS public.listing_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_listing_id UUID NOT NULL REFERENCES public.user_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  listing_type TEXT NOT NULL,            -- 'coaching' | 'college'
  target_table TEXT NOT NULL,            -- 'institutes' | 'colleges'
  target_record_id UUID NOT NULL,        -- the live row being edited
  old_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb, -- { field: { old, new } }
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | modified
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lcr_user_id ON public.listing_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_lcr_status ON public.listing_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_lcr_user_listing_id ON public.listing_change_requests(user_listing_id);

ALTER TABLE public.listing_change_requests ENABLE ROW LEVEL SECURITY;

-- Users: read & insert their own change requests
CREATE POLICY "Users can view own change requests"
ON public.listing_change_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own change requests"
ON public.listing_change_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users may update their OWN pending request (e.g., resubmit before review)
CREATE POLICY "Users can update own pending change requests"
ON public.listing_change_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins: full access
CREATE POLICY "Admins manage all change requests"
ON public.listing_change_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_lcr_updated_at
BEFORE UPDATE ON public.listing_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();