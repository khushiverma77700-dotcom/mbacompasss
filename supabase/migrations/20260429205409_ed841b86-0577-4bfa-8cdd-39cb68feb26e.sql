CREATE OR REPLACE FUNCTION public.recover_stale_mock_section_jobs(_threshold_minutes integer DEFAULT 5)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _n int;
BEGIN
  UPDATE public.mock_section_jobs
  SET status = 'pending',
      worker_lock_until = NULL,
      current_step = 'watchdog: requeued after stuck worker',
      updated_at = now()
  WHERE status = 'processing'
    AND (worker_lock_until IS NULL
         OR worker_lock_until < now() - make_interval(mins => GREATEST(_threshold_minutes,1)));
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$function$;