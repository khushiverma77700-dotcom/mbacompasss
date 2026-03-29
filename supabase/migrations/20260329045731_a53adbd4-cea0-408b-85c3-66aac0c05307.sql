ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_exams text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_experience text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signup_page_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signup_page_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;