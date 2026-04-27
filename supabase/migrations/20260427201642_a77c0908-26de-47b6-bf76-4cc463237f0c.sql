CREATE TABLE public.daily_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_date DATE NOT NULL UNIQUE,
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  title TEXT,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_test_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily assignments" ON public.daily_test_assignments FOR SELECT USING (true);
CREATE POLICY "Admins insert daily assignments" ON public.daily_test_assignments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update daily assignments" ON public.daily_test_assignments FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete daily assignments" ON public.daily_test_assignments FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_dta_updated BEFORE UPDATE ON public.daily_test_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_dta_date ON public.daily_test_assignments(assigned_date DESC);

CREATE TABLE public.student_daily_test_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assigned_date DATE NOT NULL,
  test_id UUID NOT NULL,
  attempt_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, assigned_date)
);
ALTER TABLE public.student_daily_test_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own daily progress" ON public.student_daily_test_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own daily progress" ON public.student_daily_test_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own daily progress" ON public.student_daily_test_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_sdtp_updated BEFORE UPDATE ON public.student_daily_test_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_sdtp_user_date ON public.student_daily_test_progress(user_id, assigned_date DESC);

CREATE OR REPLACE FUNCTION public.get_today_daily_test()
RETURNS TABLE(
  assignment_id UUID, assigned_date DATE, test_id UUID, title TEXT, note TEXT,
  test_name TEXT, test_slug TEXT, exam_code TEXT, duration INTEGER,
  my_progress_id UUID, my_attempt_id UUID, completed_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT d.id, d.assigned_date, d.test_id,
    COALESCE(d.title, concat('Daily Mock — ', to_char(d.assigned_date,'DD Mon'))) AS title,
    d.note, m.name, m.slug, m.exam_code, m.total_duration_minutes,
    p.id, p.attempt_id, p.completed_at
  FROM public.daily_test_assignments d
  JOIN public.mock_tests m ON m.id = d.test_id
  LEFT JOIN public.student_daily_test_progress p
    ON p.assigned_date = d.assigned_date AND p.user_id = auth.uid()
  WHERE d.assigned_date = CURRENT_DATE
  LIMIT 1;
$$;