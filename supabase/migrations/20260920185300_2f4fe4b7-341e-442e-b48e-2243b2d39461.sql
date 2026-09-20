-- 1. Pin search_path on project-owned SECURITY DEFINER functions
ALTER FUNCTION public.delete_email(queue_name text, message_id bigint) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.enqueue_email(queue_name text, payload jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) SET search_path = public, pgmq, pg_temp;

-- 2. Remove broad claim policy on shortlister_submissions; claiming now happens
--    server-side only, matched on the authenticated user's own verified email.
DROP POLICY IF EXISTS "Users can claim their unclaimed submission" ON public.shortlister_submissions;

CREATE POLICY "Users can update their own submissions"
ON public.shortlister_submissions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_shortlister_submissions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.shortlister_submissions
  SET user_id = v_uid
  WHERE user_id IS NULL
    AND lower(email) = v_email;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_shortlister_submissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_shortlister_submissions() TO authenticated;