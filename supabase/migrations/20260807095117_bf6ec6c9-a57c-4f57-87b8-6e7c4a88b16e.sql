CREATE TABLE public.shortlister_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'login_incomplete',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb,
  results_count integer,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.shortlister_submissions TO authenticated;
GRANT INSERT ON public.shortlister_submissions TO anon;
GRANT ALL ON public.shortlister_submissions TO service_role;

ALTER TABLE public.shortlister_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a shortlister submission"
ON public.shortlister_submissions FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their own submissions"
ON public.shortlister_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all submissions"
ON public.shortlister_submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can claim their unclaimed submission"
ON public.shortlister_submissions FOR UPDATE TO authenticated
USING (user_id IS NULL OR user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_shortlister_submissions_updated_at
BEFORE UPDATE ON public.shortlister_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shortlister_submissions_created_at ON public.shortlister_submissions (created_at DESC);