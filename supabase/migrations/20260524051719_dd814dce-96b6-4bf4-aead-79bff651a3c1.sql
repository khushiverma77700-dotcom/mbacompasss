-- 1. cat_score_submissions: enforce non-null user_id
ALTER TABLE public.cat_score_submissions
  ALTER COLUMN user_id SET NOT NULL;

-- 2. phone_otps: document that otp_code stores a SHA-256 hash, not plaintext
COMMENT ON COLUMN public.phone_otps.otp_code IS 'SHA-256 hash of the OTP code. Never stores plaintext OTPs.';

-- 3. Remove cta_settings from realtime publication (not needed for live broadcast)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cta_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.cta_settings';
  END IF;
END $$;