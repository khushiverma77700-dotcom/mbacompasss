-- Create programme_courses table for verified MBA programme portfolios per college
CREATE TABLE public.programme_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id UUID NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  programme_type TEXT NOT NULL DEFAULT 'MBA',
  duration TEXT,
  duration_months INTEGER,
  mode TEXT DEFAULT 'Full-time',
  fees_total_lakhs NUMERIC,
  fees_breakdown TEXT,
  fees_year TEXT,
  
  -- Eligibility
  min_graduation_percent NUMERIC,
  accepts_cat BOOLEAN DEFAULT false,
  accepts_xat BOOLEAN DEFAULT false,
  accepts_gmat BOOLEAN DEFAULT false,
  accepts_gre BOOLEAN DEFAULT false,
  accepts_cmat BOOLEAN DEFAULT false,
  accepts_nmat BOOLEAN DEFAULT false,
  accepts_snap BOOLEAN DEFAULT false,
  accepts_iift BOOLEAN DEFAULT false,
  accepts_other_exams TEXT[],
  cat_percentile_target TEXT,
  xat_percentile_target TEXT,
  gmat_score_target TEXT,
  
  min_work_ex_months INTEGER DEFAULT 0,
  max_work_ex_months INTEGER,
  min_age INTEGER,
  max_age INTEGER,
  
  specializations TEXT[] DEFAULT '{}',
  highlights TEXT[],
  intake_seats INTEGER,
  
  -- Source verification
  source_url TEXT,
  source_brochure_url TEXT,
  evidence_snippet TEXT,
  source_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Meta
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (college_id, slug)
);

CREATE INDEX idx_programme_courses_college ON public.programme_courses(college_id);
CREATE INDEX idx_programme_courses_active ON public.programme_courses(active);

ALTER TABLE public.programme_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programme courses viewable by everyone"
ON public.programme_courses
FOR SELECT
USING (active = true);

CREATE POLICY "Admins manage programme_courses"
ON public.programme_courses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_programme_courses_updated_at
BEFORE UPDATE ON public.programme_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();