-- Create roi_analyses table
CREATE TABLE public.roi_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  -- Inputs
  graduation_stream TEXT NOT NULL,
  current_salary_lakhs NUMERIC NOT NULL DEFAULT 0,
  work_experience_years NUMERIC NOT NULL DEFAULT 0,
  target_exams TEXT[] NOT NULL DEFAULT '{}'::text[],
  expected_tier TEXT NOT NULL DEFAULT 'Tier 1',
  preferred_specialization TEXT,
  budget_lakhs NUMERIC NOT NULL DEFAULT 0,
  preferred_location TEXT,
  target_states TEXT[] DEFAULT '{}'::text[],
  -- Computed
  total_investment_lakhs NUMERIC,
  expected_salary_lakhs NUMERIC,
  payback_years NUMERIC,
  roi_score NUMERIC,
  roi_category TEXT,
  -- Output
  ai_insights JSONB DEFAULT '{}'::jsonb,
  college_recommendations JSONB DEFAULT '{}'::jsonb,
  report_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roi_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create roi analysis"
  ON public.roi_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own roi analyses"
  ON public.roi_analyses FOR SELECT
  USING (((user_id IS NOT NULL) AND (auth.uid() = user_id)) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own roi analyses"
  ON public.roi_analyses FOR UPDATE
  USING (((user_id IS NOT NULL) AND (auth.uid() = user_id)) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roi analyses"
  ON public.roi_analyses FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_roi_analyses_updated_at
  BEFORE UPDATE ON public.roi_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_roi_analyses_user_id ON public.roi_analyses(user_id);
CREATE INDEX idx_roi_analyses_created_at ON public.roi_analyses(created_at DESC);
CREATE INDEX idx_roi_analyses_roi_category ON public.roi_analyses(roi_category);