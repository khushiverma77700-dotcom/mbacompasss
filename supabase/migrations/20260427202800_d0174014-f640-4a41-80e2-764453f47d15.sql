-- =========================================
-- Day Planner Tasks
-- =========================================
CREATE TABLE public.student_planner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'custom',
  priority text NOT NULL DEFAULT 'medium',
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  scheduled_start_time time,
  estimated_minutes integer NOT NULL DEFAULT 30,
  actual_minutes integer,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planner_tasks_user_date ON public.student_planner_tasks(user_id, scheduled_date);
CREATE INDEX idx_planner_tasks_status ON public.student_planner_tasks(user_id, status);

ALTER TABLE public.student_planner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own planner tasks"
ON public.student_planner_tasks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all planner tasks"
ON public.student_planner_tasks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_planner_tasks_updated_at
BEFORE UPDATE ON public.student_planner_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- MBA Compass Courses (paid in-house programs)
-- =========================================
CREATE TABLE public.mba_compass_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text,
  description text,
  exam_focus text[],
  mode text DEFAULT 'online',
  duration_weeks integer,
  price numeric(10,2),
  original_price numeric(10,2),
  discount_percent integer,
  features jsonb DEFAULT '[]'::jsonb,
  highlights jsonb DEFAULT '[]'::jsonb,
  curriculum jsonb DEFAULT '[]'::jsonb,
  thumbnail_url text,
  banner_url text,
  enroll_url text,
  brochure_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mba_compass_active ON public.mba_compass_courses(is_active, sort_order);

ALTER TABLE public.mba_compass_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active courses are publicly viewable"
ON public.mba_compass_courses
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage compass courses"
ON public.mba_compass_courses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mba_compass_updated_at
BEFORE UPDATE ON public.mba_compass_courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();