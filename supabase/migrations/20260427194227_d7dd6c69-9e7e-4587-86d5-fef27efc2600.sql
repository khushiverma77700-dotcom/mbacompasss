
-- Study profile (1 per user) — drives the AI planner
CREATE TABLE IF NOT EXISTS public.student_study_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  target_percentile NUMERIC,
  target_colleges TEXT[] DEFAULT '{}',
  current_level TEXT,
  strong_sections TEXT[] DEFAULT '{}',
  weak_sections TEXT[] DEFAULT '{}',
  daily_hours NUMERIC,
  attempt_year INTEGER,
  preferred_session TEXT,
  ai_plan JSONB,
  ai_insights JSONB,
  ai_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_study_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.student_study_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.student_study_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.student_study_profile FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_study_profile_updated BEFORE UPDATE ON public.student_study_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily tasks generated/managed for each user
CREATE TABLE IF NOT EXISTS public.student_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  section TEXT,
  task_type TEXT,
  title TEXT NOT NULL,
  target_value INTEGER,
  duration_minutes INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_daily_tasks_user_date ON public.student_daily_tasks(user_id, task_date);
ALTER TABLE public.student_daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks all" ON public.student_daily_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weak topic tracking (red/yellow/green)
CREATE TABLE IF NOT EXISTS public.student_weak_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  section TEXT NOT NULL,
  topic TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'red',
  accuracy NUMERIC,
  attempts INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, section, topic)
);
ALTER TABLE public.student_weak_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weak topics all" ON public.student_weak_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
