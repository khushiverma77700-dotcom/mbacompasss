
-- Profile Analyses table - stores student inputs and lead data
CREATE TABLE public.profile_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Academic Details (Step 1)
  tenth_score NUMERIC NOT NULL,
  twelfth_score NUMERIC NOT NULL,
  graduation_score NUMERIC NOT NULL,
  graduation_stream TEXT NOT NULL,
  
  -- Profile Details (Step 2)
  work_experience_months INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  gender TEXT,
  target_exam TEXT NOT NULL,
  
  -- Aspirations (Step 3)
  target_colleges TEXT[] DEFAULT '{}'::TEXT[],
  preferred_specialization TEXT,
  
  -- Lead Capture
  phone TEXT,
  email TEXT,
  report_unlocked BOOLEAN DEFAULT false,
  
  -- Computed
  profile_score NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analysis Results table - stores AI-generated insights
CREATE TABLE public.analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_analysis_id UUID NOT NULL REFERENCES public.profile_analyses(id) ON DELETE CASCADE,
  
  strengths JSONB DEFAULT '[]'::JSONB,
  weaknesses JSONB DEFAULT '[]'::JSONB,
  college_predictions JSONB DEFAULT '{}'::JSONB,
  probability_scores JSONB DEFAULT '{}'::JSONB,
  recommendations JSONB DEFAULT '[]'::JSONB,
  study_plan JSONB DEFAULT '[]'::JSONB,
  ai_summary TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Profile analyses policies
CREATE POLICY "Anyone can create profile analysis"
ON public.profile_analyses FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view own analyses"
ON public.profile_analyses FOR SELECT
TO public
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update own analyses"
ON public.profile_analyses FOR UPDATE
TO public
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete analyses"
ON public.profile_analyses FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Analysis results policies
CREATE POLICY "Results viewable by analysis owner or admin"
ON public.analysis_results FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profile_analyses pa
    WHERE pa.id = profile_analysis_id
    AND (
      (pa.user_id IS NOT NULL AND auth.uid() = pa.user_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Anyone can create results"
ON public.analysis_results FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can manage results"
ON public.analysis_results FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_profile_analyses_updated_at
BEFORE UPDATE ON public.profile_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
