
CREATE TABLE public.meritto_lead_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  name TEXT,
  email TEXT,
  mobile TEXT,
  state TEXT,
  city TEXT,
  campus TEXT,
  course TEXT,
  medium TEXT,
  campaign TEXT,
  payload JSONB NOT NULL,
  response JSONB,
  http_status INT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meritto_lead_logs_created_at ON public.meritto_lead_logs(created_at DESC);
CREATE INDEX idx_meritto_lead_logs_status ON public.meritto_lead_logs(status);
CREATE INDEX idx_meritto_lead_logs_source ON public.meritto_lead_logs(source);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meritto_lead_logs TO authenticated;
GRANT ALL ON public.meritto_lead_logs TO service_role;

ALTER TABLE public.meritto_lead_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view meritto logs"
  ON public.meritto_lead_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update meritto logs"
  ON public.meritto_lead_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete meritto logs"
  ON public.meritto_lead_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_meritto_lead_logs_updated_at
  BEFORE UPDATE ON public.meritto_lead_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
