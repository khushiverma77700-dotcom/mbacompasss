
-- 1. phone_otps: Lock down public read/update/insert. Only service role (edge functions) should access.
DROP POLICY IF EXISTS "Anyone can read OTP" ON public.phone_otps;
DROP POLICY IF EXISTS "Anyone can update OTP" ON public.phone_otps;
DROP POLICY IF EXISTS "Anyone can create OTP" ON public.phone_otps;
DROP POLICY IF EXISTS "Admins can manage OTPs" ON public.phone_otps;

-- Only admins can directly view/manage OTPs from the client; edge functions use service role and bypass RLS.
CREATE POLICY "Admins can manage phone_otps"
  ON public.phone_otps
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. profile_analyses: prevent ownership spoofing on INSERT
DROP POLICY IF EXISTS "Anyone can create profile analysis" ON public.profile_analyses;
CREATE POLICY "Anyone can create profile analysis"
  ON public.profile_analyses
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 3. analysis_results: tighten INSERT to require ownership of the linked profile_analyses row
DROP POLICY IF EXISTS "Users can insert own results" ON public.analysis_results;
CREATE POLICY "Users can insert own results"
  ON public.analysis_results
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_analyses pa
      WHERE pa.id = analysis_results.profile_analysis_id
        AND (pa.user_id IS NULL OR pa.user_id = auth.uid())
    )
  );

-- 4. indexing_urls: remove public update; only admins/service role
DROP POLICY IF EXISTS "Service can update indexing_urls" ON public.indexing_urls;
DROP POLICY IF EXISTS "Service can insert indexing_urls" ON public.indexing_urls;

-- Edge functions use the service role and bypass RLS, so no public/anon policies are needed.
-- Admins retain full access via the existing "Admins can manage indexing_urls" policy.

-- 5. indexing_logs: remove public insert; admins + service role only
DROP POLICY IF EXISTS "Service can insert indexing_logs" ON public.indexing_logs;

-- 6. Remove inquiries from supabase_realtime publication to stop broadcasting PII
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inquiries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.inquiries';
  END IF;
END $$;
