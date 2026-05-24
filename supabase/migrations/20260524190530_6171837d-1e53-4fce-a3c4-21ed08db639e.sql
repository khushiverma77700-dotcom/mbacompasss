
CREATE TABLE public.personalized_bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running',
  total_requested integer NOT NULL DEFAULT 0,
  total_generated integer NOT NULL DEFAULT 0,
  total_failed integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE public.personalized_bulk_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.personalized_bulk_jobs(id) ON DELETE CASCADE,
  exam_code text NOT NULL,
  section text NOT NULL,
  difficulty text NOT NULL,
  existing_count integer NOT NULL DEFAULT 0,
  requested_count integer NOT NULL,
  generated_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  current_step text,
  worker_lock_until timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pb_items_job ON public.personalized_bulk_items(job_id);
CREATE INDEX idx_pb_items_status ON public.personalized_bulk_items(status, worker_lock_until);

ALTER TABLE public.personalized_bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_bulk_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bulk jobs"
  ON public.personalized_bulk_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage bulk items"
  ON public.personalized_bulk_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pb_jobs_updated BEFORE UPDATE ON public.personalized_bulk_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pb_items_updated BEFORE UPDATE ON public.personalized_bulk_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Claim next available bulk item (admin-callable; SECURITY DEFINER so cron edge fn can claim too)
CREATE OR REPLACE FUNCTION public.claim_personalized_bulk_item(_lock_minutes integer DEFAULT 3)
RETURNS public.personalized_bulk_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.personalized_bulk_items;
BEGIN
  UPDATE public.personalized_bulk_items
  SET status = 'processing',
      attempts = attempts + 1,
      worker_lock_until = now() + make_interval(mins => GREATEST(_lock_minutes, 1)),
      started_at = COALESCE(started_at, now()),
      current_step = 'claimed by worker',
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.personalized_bulk_items
    WHERE (status = 'pending')
       OR (status = 'processing' AND (worker_lock_until IS NULL OR worker_lock_until < now()))
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO r;
  RETURN r;
END;
$$;

-- Rollup totals onto parent job
CREATE OR REPLACE FUNCTION public.rollup_personalized_bulk_job(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gen int := 0;
  _fail int := 0;
  _pending int := 0;
BEGIN
  SELECT COALESCE(SUM(generated_count),0),
         COALESCE(SUM(failed_count),0),
         COUNT(*) FILTER (WHERE status IN ('pending','processing'))
    INTO _gen, _fail, _pending
  FROM public.personalized_bulk_items
  WHERE job_id = _job_id;

  UPDATE public.personalized_bulk_jobs
  SET total_generated = _gen,
      total_failed = _fail,
      status = CASE WHEN _pending > 0 THEN 'running' ELSE 'completed' END,
      finished_at = CASE WHEN _pending = 0 THEN COALESCE(finished_at, now()) ELSE finished_at END,
      updated_at = now()
  WHERE id = _job_id;
END;
$$;
