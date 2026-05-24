
CREATE TABLE public.vocab_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested integer NOT NULL,
  generated integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  category text,
  difficulty text,
  current_activity text,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vocab_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vocab generation jobs"
  ON public.vocab_generation_jobs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER vocab_generation_jobs_updated_at
  BEFORE UPDATE ON public.vocab_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
