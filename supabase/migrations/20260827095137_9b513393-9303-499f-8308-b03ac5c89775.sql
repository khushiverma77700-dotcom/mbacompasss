-- =========================================================
-- System Check: runs, per-check results, cron config
-- =========================================================

CREATE TABLE public.system_check_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  run_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  trigger TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  warned INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX system_check_runs_started_idx ON public.system_check_runs (started_at DESC);
CREATE INDEX system_check_runs_date_idx ON public.system_check_runs (run_date DESC);

GRANT SELECT ON public.system_check_runs TO authenticated;
GRANT ALL ON public.system_check_runs TO service_role;

ALTER TABLE public.system_check_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system check runs"
  ON public.system_check_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_system_check_runs_updated_at
  BEFORE UPDATE ON public.system_check_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.system_check_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.system_check_runs(id) ON DELETE CASCADE,
  run_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  section TEXT NOT NULL,
  check_key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'api',
  provider TEXT,
  target TEXT,
  status TEXT NOT NULL DEFAULT 'pass',
  http_status INTEGER,
  latency_ms INTEGER,
  message TEXT,
  fix_hint TEXT,
  used_in TEXT[] NOT NULL DEFAULT '{}',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX system_check_results_run_idx ON public.system_check_results (run_id);
CREATE INDEX system_check_results_key_date_idx ON public.system_check_results (check_key, run_date DESC);
CREATE INDEX system_check_results_status_idx ON public.system_check_results (status);

GRANT SELECT ON public.system_check_results TO authenticated;
GRANT ALL ON public.system_check_results TO service_role;

ALTER TABLE public.system_check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system check results"
  ON public.system_check_results FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- Backend-only config row: token the daily cron uses to authorise a run.
CREATE TABLE public.system_check_config (
  id BOOLEAN NOT NULL DEFAULT true PRIMARY KEY CHECK (id),
  cron_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  daily_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.system_check_config TO service_role;

ALTER TABLE public.system_check_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.system_check_config (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TRIGGER update_system_check_config_updated_at
  BEFORE UPDATE ON public.system_check_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();