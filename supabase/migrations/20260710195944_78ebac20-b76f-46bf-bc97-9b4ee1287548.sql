
CREATE TABLE public.master_refresh_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'smart' CHECK (mode IN ('smart','full')),
  model TEXT NOT NULL DEFAULT 'openai/gpt-5-mini',
  freshness TEXT NOT NULL DEFAULT 'all',
  entity_types TEXT[] NOT NULL DEFAULT ARRAY['college','institute','course','article']::text[],
  concurrency INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','paused','completed','failed','cancelled')),
  paused BOOLEAN NOT NULL DEFAULT false,
  total INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  in_progress INTEGER NOT NULL DEFAULT 0,
  last_activity TEXT,
  created_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_refresh_jobs TO authenticated;
GRANT ALL ON public.master_refresh_jobs TO service_role;

ALTER TABLE public.master_refresh_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage master refresh jobs"
  ON public.master_refresh_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_master_refresh_jobs_updated_at
  BEFORE UPDATE ON public.master_refresh_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.master_refresh_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.master_refresh_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','succeeded','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  worker_lock_until TIMESTAMPTZ,
  error TEXT,
  changed_fields INTEGER,
  total_fields INTEGER,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_refresh_items TO authenticated;
GRANT ALL ON public.master_refresh_items TO service_role;

ALTER TABLE public.master_refresh_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage master refresh items"
  ON public.master_refresh_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_master_refresh_items_job_status ON public.master_refresh_items(job_id, status);
CREATE INDEX idx_master_refresh_items_pending ON public.master_refresh_items(status, worker_lock_until) WHERE status IN ('pending','processing');

CREATE TRIGGER update_master_refresh_items_updated_at
  BEFORE UPDATE ON public.master_refresh_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic claim: pick one pending item across active (non-paused) jobs.
CREATE OR REPLACE FUNCTION public.claim_master_refresh_item(_lock_minutes integer DEFAULT 5)
RETURNS public.master_refresh_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.master_refresh_items;
BEGIN
  UPDATE public.master_refresh_items
  SET status = 'processing',
      attempts = attempts + 1,
      worker_lock_until = now() + make_interval(mins => GREATEST(_lock_minutes, 1)),
      started_at = COALESCE(started_at, now()),
      updated_at = now()
  WHERE id = (
    SELECT i.id
    FROM public.master_refresh_items i
    JOIN public.master_refresh_jobs j ON j.id = i.job_id
    WHERE j.status IN ('queued','running')
      AND j.paused = false
      AND (
        i.status = 'pending'
        OR (i.status = 'processing' AND (i.worker_lock_until IS NULL OR i.worker_lock_until < now()))
      )
    ORDER BY i.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO r;
  RETURN r;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_master_refresh_item(integer) FROM public, anon, authenticated;
