CREATE OR REPLACE FUNCTION public.claim_exam_generation_job(_lock_minutes integer DEFAULT 10, _max_attempts integer DEFAULT 3)
RETURNS SETOF public.exam_generation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id
  FROM public.exam_generation_jobs
  WHERE status IN ('queued', 'running')
    AND (worker_lock_until IS NULL OR worker_lock_until < now())
    AND COALESCE(attempts, 0) < _max_attempts
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF _id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.exam_generation_jobs
     SET status = 'running',
         worker_lock_until = now() + make_interval(mins => _lock_minutes),
         attempts = COALESCE(attempts, 0) + 1,
         updated_at = now()
   WHERE id = _id
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_exam_generation_job(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_exam_generation_job(integer, integer) TO service_role;