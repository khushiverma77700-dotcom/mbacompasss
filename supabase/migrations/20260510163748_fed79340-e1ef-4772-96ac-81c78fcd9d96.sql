-- Add missing feature-toggle columns to mba_compass_courses
ALTER TABLE public.mba_compass_courses
  ADD COLUMN IF NOT EXISTS has_daily_mocks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_previous_year_papers boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_personalized_hub boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ai_insights boolean DEFAULT false;
