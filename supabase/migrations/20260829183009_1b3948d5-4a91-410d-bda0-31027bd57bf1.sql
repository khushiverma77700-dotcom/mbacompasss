CREATE OR REPLACE FUNCTION public.seo_intel_claim_job(p_lease_seconds int DEFAULT 180)
RETURNS SETOF public.seo_intel_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.seo_intel_jobs
  WHERE status = 'queued' AND scheduled_for <= now()
  ORDER BY priority ASC, scheduled_for ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.seo_intel_jobs
     SET status = 'running',
         started_at = COALESCE(started_at, now()),
         lease_until = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
   WHERE id = v_id
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.seo_intel_claim_job(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_intel_claim_job(int) TO service_role;

CREATE OR REPLACE FUNCTION public.seo_intel_recover_stalled()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  WITH stalled AS (
    SELECT id, retry_count, max_retries
    FROM public.seo_intel_jobs
    WHERE status = 'running' AND lease_until IS NOT NULL AND lease_until < now()
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE public.seo_intel_jobs j
       SET status = CASE WHEN s.retry_count + 1 > s.max_retries THEN 'failed' ELSE 'queued' END,
           retry_count = s.retry_count + 1,
           error = COALESCE(j.error, 'Worker lease expired (timeout)'),
           scheduled_for = now() + interval '30 seconds',
           lease_until = NULL,
           finished_at = CASE WHEN s.retry_count + 1 > s.max_retries THEN now() ELSE NULL END,
           updated_at = now()
      FROM stalled s
     WHERE j.id = s.id
    RETURNING j.id
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.seo_intel_recover_stalled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_intel_recover_stalled() TO service_role;