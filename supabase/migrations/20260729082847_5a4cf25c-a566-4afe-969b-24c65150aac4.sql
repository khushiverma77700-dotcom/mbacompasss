-- 1) Pin search_path on pgmq helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2) email_send_state: add admin-scoped policy alongside service_role
CREATE POLICY "Admins can manage email send state"
  ON public.email_send_state
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) phone_otps: remove overlapping permissive ALL policy; keep restrictive SELECT admin-only,
--    add explicit non-overlapping admin policies for INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "Admins can manage phone_otps" ON public.phone_otps;

CREATE POLICY "phone_otps_admin_insert"
  ON public.phone_otps FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "phone_otps_admin_update"
  ON public.phone_otps FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "phone_otps_admin_delete"
  ON public.phone_otps FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "phone_otps_admin_select"
  ON public.phone_otps FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) uploads bucket: remove broad public SELECT policy that enables directory enumeration.
--    Public URL fetches via /object/public/uploads/* continue to work because the bucket
--    is marked public (bypasses RLS on direct object endpoint).
DROP POLICY IF EXISTS "Public can fetch uploads by path" ON storage.objects;