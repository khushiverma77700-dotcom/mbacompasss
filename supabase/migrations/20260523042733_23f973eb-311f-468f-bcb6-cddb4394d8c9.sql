
-- 1. phone_otps: explicit deny-SELECT for non-admins (admin ALL policy still grants access)
DROP POLICY IF EXISTS "Deny select to non-admins" ON public.phone_otps;
CREATE POLICY "Deny select to non-admins"
  ON public.phone_otps
  FOR SELECT
  TO authenticated, anon
  USING (false);

-- 2. welcome_email_template: restrict reads to admins only
DROP POLICY IF EXISTS "Anyone can read welcome template" ON public.welcome_email_template;
DROP POLICY IF EXISTS "Admins can read welcome template" ON public.welcome_email_template;
CREATE POLICY "Admins can read welcome template"
  ON public.welcome_email_template
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
