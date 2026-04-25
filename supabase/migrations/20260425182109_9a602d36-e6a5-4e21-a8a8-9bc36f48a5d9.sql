CREATE OR REPLACE FUNCTION public.refresh_bulk_college_job_metrics(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows jsonb;
  _succeeded integer := 0;
  _failed integer := 0;
  _duplicates integer := 0;
  _completed integer := 0;
BEGIN
  SELECT rows INTO _rows
  FROM public.bulk_college_jobs
  WHERE id = _job_id;

  IF _rows IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'status' = 'succeeded'),
    COUNT(*) FILTER (WHERE item->>'status' = 'failed'),
    COUNT(*) FILTER (WHERE item->>'status' = 'duplicate')
  INTO _succeeded, _failed, _duplicates
  FROM jsonb_array_elements(_rows) AS item;

  _completed := COALESCE(_succeeded, 0) + COALESCE(_failed, 0) + COALESCE(_duplicates, 0);

  UPDATE public.bulk_college_jobs
  SET succeeded = COALESCE(_succeeded, 0),
      failed = COALESCE(_failed, 0),
      duplicates_skipped = COALESCE(_duplicates, 0),
      completed = COALESCE(_completed, 0),
      updated_at = now()
  WHERE id = _job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_bulk_section_job_metrics(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows jsonb;
  _succeeded integer := 0;
  _failed integer := 0;
  _not_found integer := 0;
  _steps_done integer := 0;
  _total_steps integer := 0;
BEGIN
  SELECT rows INTO _rows
  FROM public.bulk_section_jobs
  WHERE id = _job_id;

  IF _rows IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'status' = 'succeeded'),
    COUNT(*) FILTER (WHERE item->>'status' = 'failed'),
    COUNT(*) FILTER (WHERE item->>'status' = 'not_found')
  INTO _succeeded, _failed, _not_found
  FROM jsonb_array_elements(_rows) AS item;

  SELECT
    COUNT(*) FILTER (WHERE step->>'status' IN ('succeeded', 'failed')),
    COUNT(*)
  INTO _steps_done, _total_steps
  FROM jsonb_array_elements(_rows) AS row_item
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(row_item->'steps', '[]'::jsonb)) AS step;

  UPDATE public.bulk_section_jobs
  SET succeeded = COALESCE(_succeeded, 0),
      failed = COALESCE(_failed, 0),
      not_found = COALESCE(_not_found, 0),
      steps_done = COALESCE(_steps_done, 0),
      total_steps = GREATEST(total_steps, COALESCE(_total_steps, 0)),
      updated_at = now()
  WHERE id = _job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_stale_bulk_jobs(_threshold_minutes integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff timestamptz := now() - make_interval(mins => GREATEST(_threshold_minutes, 1));
  _college_count integer := 0;
  _section_count integer := 0;
  _job record;
  _rows jsonb;
BEGIN
  FOR _job IN
    SELECT id, rows
    FROM public.bulk_college_jobs
    WHERE status IN ('pending', 'running', 'processing')
      AND paused = false
      AND updated_at < _cutoff
  LOOP
    SELECT jsonb_agg(
      CASE
        WHEN item->>'status' = 'processing' THEN
          item || jsonb_build_object(
            'status', 'pending',
            'step', 'auto-requeued after stale worker',
            'attemptStartedAt', NULL,
            'error', NULL
          )
        ELSE item
      END
      ORDER BY ord
    )
    INTO _rows
    FROM jsonb_array_elements(_job.rows) WITH ORDINALITY AS e(item, ord);

    UPDATE public.bulk_college_jobs
    SET rows = COALESCE(_rows, '[]'::jsonb),
        status = 'running',
        worker_id = NULL,
        worker_lock_until = NULL,
        current_activity = 'Watchdog: stale job recovered and ready to resume',
        updated_at = now()
    WHERE id = _job.id;

    PERFORM public.refresh_bulk_college_job_metrics(_job.id);
    _college_count := _college_count + 1;
  END LOOP;

  FOR _job IN
    SELECT id, rows
    FROM public.bulk_section_jobs
    WHERE status IN ('pending', 'running', 'processing')
      AND paused = false
      AND updated_at < _cutoff
  LOOP
    SELECT jsonb_agg(
      CASE
        WHEN item->>'status' = 'processing' THEN
          jsonb_set(
            item || jsonb_build_object('status', 'pending', 'error', NULL),
            '{steps}',
            COALESCE((
              SELECT jsonb_agg(
                CASE
                  WHEN step->>'status' = 'processing' THEN step || jsonb_build_object('status', 'pending', 'startedAt', NULL, 'error', NULL)
                  ELSE step
                END
              )
              FROM jsonb_array_elements(COALESCE(item->'steps', '[]'::jsonb)) AS step
            ), '[]'::jsonb)
          )
        ELSE item
      END
      ORDER BY ord
    )
    INTO _rows
    FROM jsonb_array_elements(_job.rows) WITH ORDINALITY AS e(item, ord);

    UPDATE public.bulk_section_jobs
    SET rows = COALESCE(_rows, '[]'::jsonb),
        status = 'running',
        worker_id = NULL,
        worker_lock_until = NULL,
        current_activity = 'Watchdog: stale job recovered and ready to resume',
        updated_at = now()
    WHERE id = _job.id;

    PERFORM public.refresh_bulk_section_job_metrics(_job.id);
    _section_count := _section_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'college_jobs_recovered', _college_count,
    'section_jobs_recovered', _section_count,
    'threshold_minutes', GREATEST(_threshold_minutes, 1)
  );
END;
$$;