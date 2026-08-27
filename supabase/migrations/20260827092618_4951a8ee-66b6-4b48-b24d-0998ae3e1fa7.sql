CREATE TABLE public.exam_backfill_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  fields_filled INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_backfill_jobs TO authenticated;
GRANT ALL ON public.exam_backfill_jobs TO service_role;
ALTER TABLE public.exam_backfill_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage exam backfill jobs" ON public.exam_backfill_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.exam_backfill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.exam_backfill_jobs(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  exam_slug TEXT,
  exam_year INTEGER,
  official_website TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  step TEXT,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps_before INTEGER NOT NULL DEFAULT 0,
  gaps_after INTEGER NOT NULL DEFAULT 0,
  fields_filled INTEGER NOT NULL DEFAULT 0,
  passes INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  log JSONB NOT NULL DEFAULT '[]'::jsonb,
  research JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  worker_lock_until TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_backfill_items TO authenticated;
GRANT ALL ON public.exam_backfill_items TO service_role;
ALTER TABLE public.exam_backfill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage exam backfill items" ON public.exam_backfill_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_exam_backfill_items_job ON public.exam_backfill_items(job_id);
CREATE INDEX idx_exam_backfill_items_status ON public.exam_backfill_items(status);

CREATE TRIGGER trg_exam_backfill_jobs_updated_at
  BEFORE UPDATE ON public.exam_backfill_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_exam_backfill_items_updated_at
  BEFORE UPDATE ON public.exam_backfill_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_exam_backfill_item(_lock_minutes INTEGER DEFAULT 10, _max_attempts INTEGER DEFAULT 3)
RETURNS SETOF public.exam_backfill_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  SELECT i.id INTO _id
  FROM public.exam_backfill_items i
  WHERE i.status IN ('queued', 'running')
    AND i.attempts < _max_attempts
    AND (i.worker_lock_until IS NULL OR i.worker_lock_until < now())
  ORDER BY i.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF _id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.exam_backfill_items
  SET status = 'running',
      attempts = attempts + 1,
      worker_lock_until = now() + (_lock_minutes || ' minutes')::interval,
      started_at = COALESCE(started_at, now())
  WHERE id = _id
  RETURNING *;
END;
$$;