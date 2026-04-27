
-- Add admin-assignment metadata to mock_enrollments
ALTER TABLE public.mock_enrollments
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Allow admins to manage all enrollments (assign to any student)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mock_enrollments' AND policyname='Admins manage mock_enrollments'
  ) THEN
    CREATE POLICY "Admins manage mock_enrollments" ON public.mock_enrollments
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Student announcements (admin pushes; visible to all logged-in students or targeted)
CREATE TABLE IF NOT EXISTS public.student_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  link_url text,
  link_label text,
  audience text NOT NULL DEFAULT 'all', -- 'all' | 'enrolled'
  is_active boolean NOT NULL DEFAULT true,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.student_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active announcements visible to logged-in users"
  ON public.student_announcements FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage student_announcements"
  ON public.student_announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_student_announcements_updated
  BEFORE UPDATE ON public.student_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Student goals & study planner
CREATE TABLE IF NOT EXISTS public.student_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_type text NOT NULL DEFAULT 'weekly', -- weekly | daily | exam
  title text NOT NULL,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text DEFAULT 'mocks',
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals" ON public.student_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all goals" ON public.student_goals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_student_goals_updated
  BEFORE UPDATE ON public.student_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_student_goals_user ON public.student_goals(user_id);

-- Helper: admins need to search students. Provide a SECURITY DEFINER function so admins can list profiles by name/email.
CREATE OR REPLACE FUNCTION public.admin_search_students(_query text DEFAULT '', _limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, display_name text, email text, phone text, enrolled_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.display_name,''), 'Unknown') AS display_name,
    u.email::text AS email,
    p.phone,
    (SELECT COUNT(*) FROM public.mock_enrollments me WHERE me.user_id = p.user_id) AS enrolled_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND (
      _query = '' OR
      p.display_name ILIKE '%' || _query || '%' OR
      u.email ILIKE '%' || _query || '%' OR
      p.phone ILIKE '%' || _query || '%'
    )
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$$;
