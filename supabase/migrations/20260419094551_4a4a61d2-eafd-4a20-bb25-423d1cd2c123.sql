
-- Phase D: Tighten RLS so users can only file change-requests for listings they own,
-- and add a helper to verify ownership server-side.

CREATE OR REPLACE FUNCTION public.user_owns_listing(_user_id uuid, _target_table text, _target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _target_table = 'institutes' THEN
    RETURN EXISTS (SELECT 1 FROM public.institutes WHERE id = _target_id AND submitted_by_user_id = _user_id);
  ELSIF _target_table = 'colleges' THEN
    RETURN EXISTS (SELECT 1 FROM public.colleges WHERE id = _target_id AND submitted_by_user_id = _user_id);
  END IF;
  RETURN false;
END;
$$;

-- Replace the previous INSERT policy with an ownership-aware one
DROP POLICY IF EXISTS "Users can create own change requests" ON public.listing_change_requests;

CREATE POLICY "Users can create change requests for owned listings"
ON public.listing_change_requests
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND public.user_owns_listing(auth.uid(), target_table, target_record_id)
);

-- Same guard on UPDATE (resubmitting a pending change)
DROP POLICY IF EXISTS "Users can update own pending change requests" ON public.listing_change_requests;

CREATE POLICY "Users can update own pending change requests"
ON public.listing_change_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND public.user_owns_listing(auth.uid(), target_table, target_record_id)
);
