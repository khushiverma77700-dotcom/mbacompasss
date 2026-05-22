
CREATE TABLE IF NOT EXISTS public.mock_projected_ranks (
  attempt_id uuid PRIMARY KEY REFERENCES public.mock_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  test_id uuid NOT NULL,
  projected_air integer NOT NULL,
  air_bucket text NOT NULL,
  projected_percentile numeric NOT NULL,
  students_ahead integer NOT NULL,
  students_behind integer NOT NULL,
  topper_score numeric NOT NULL,
  difficulty text NOT NULL,
  sectional jsonb NOT NULL DEFAULT '{}'::jsonb,
  pool_size integer NOT NULL,
  real_pool_size integer NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_projected_ranks_user ON public.mock_projected_ranks(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_projected_ranks_test ON public.mock_projected_ranks(test_id);

ALTER TABLE public.mock_projected_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own projected ranks"
  ON public.mock_projected_ranks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins view all projected ranks"
  ON public.mock_projected_ranks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
