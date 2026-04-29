
CREATE TABLE public.sop_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sop_text TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  target_colleges TEXT,
  country_preference TEXT,
  deadline DATE,
  experience_years NUMERIC,
  current_role_text TEXT,
  academic_background TEXT,
  major_achievements TEXT,
  target_course TEXT,
  specialization TEXT,
  why_course TEXT,
  short_term_goals TEXT,
  long_term_goals TEXT,
  why_college TEXT,
  strengths TEXT,
  weaknesses TEXT,
  highlight_focus TEXT[],
  tone_preference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_response JSONB,
  overall_score INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sop_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own SOP reviews"
  ON public.sop_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own SOP reviews"
  ON public.sop_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own SOP reviews"
  ON public.sop_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own SOP reviews"
  ON public.sop_reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all SOP reviews"
  ON public.sop_reviews FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sop_reviews_updated_at
  BEFORE UPDATE ON public.sop_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sop_reviews_user ON public.sop_reviews(user_id, created_at DESC);
