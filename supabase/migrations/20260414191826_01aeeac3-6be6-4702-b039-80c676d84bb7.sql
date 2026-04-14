
ALTER TABLE public.profile_analyses
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS fee_budget_lakhs numeric,
  ADD COLUMN IF NOT EXISTS expected_salary_lakhs numeric,
  ADD COLUMN IF NOT EXISTS current_employer_type text[],
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS has_certifications text[],
  ADD COLUMN IF NOT EXISTS extracurriculars text[],
  ADD COLUMN IF NOT EXISTS leadership_roles text,
  ADD COLUMN IF NOT EXISTS preparation_months_remaining integer,
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS has_gap_years boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gap_year_reason text,
  ADD COLUMN IF NOT EXISTS target_exams text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_states text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_pursuing_graduation boolean DEFAULT false;
