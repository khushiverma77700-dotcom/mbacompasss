
-- Phone OTPs: replace permissive deny with restrictive admin-only SELECT
DROP POLICY IF EXISTS "Deny select to non-admins" ON public.phone_otps;
CREATE POLICY "phone_otps_select_admin_only_restrictive"
  ON public.phone_otps
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Coaching of week: hide coupon_code from anon/authenticated (only admins via column grants)
REVOKE SELECT (coupon_code) ON public.coaching_of_week FROM anon, authenticated;
