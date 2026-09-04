-- 1. Tracker catalogue -------------------------------------------------------
CREATE TABLE public.application_trackers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  category text NOT NULL DEFAULT 'exam',
  tier text,
  program text,
  location text,
  application_open_date date,
  application_deadline timestamptz,
  application_fee numeric,
  program_fee numeric,
  accepted_exams text[] NOT NULL DEFAULT '{}',
  apply_url text,
  inside_info_url text,
  inside_info_notes text,
  short_description text,
  status text NOT NULL DEFAULT 'open',
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  apply_click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_trackers_active ON public.application_trackers (is_active, is_archived);
CREATE INDEX idx_application_trackers_deadline ON public.application_trackers (application_deadline);
CREATE INDEX idx_application_trackers_category ON public.application_trackers (category);

GRANT SELECT ON public.application_trackers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_trackers TO authenticated;
GRANT ALL ON public.application_trackers TO service_role;

ALTER TABLE public.application_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active trackers"
  ON public.application_trackers FOR SELECT
  USING (is_active = true AND is_archived = false);

CREATE POLICY "Admins can view all trackers"
  ON public.application_trackers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert trackers"
  ON public.application_trackers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update trackers"
  ON public.application_trackers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete trackers"
  ON public.application_trackers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Per-student tracked applications ---------------------------------------
CREATE TABLE public.student_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tracker_id uuid NOT NULL REFERENCES public.application_trackers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  fee_paid boolean NOT NULL DEFAULT false,
  fee_amount numeric,
  notes text,
  started_at timestamptz,
  submitted_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tracker_id)
);

CREATE INDEX idx_student_applications_user ON public.student_applications (user_id);
CREATE INDEX idx_student_applications_tracker ON public.student_applications (tracker_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_applications TO authenticated;
GRANT ALL ON public.student_applications TO service_role;

ALTER TABLE public.student_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own applications"
  ON public.student_applications FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all student applications"
  ON public.student_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update student applications"
  ON public.student_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Activity log ------------------------------------------------------------
CREATE TABLE public.application_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tracker_id uuid REFERENCES public.application_trackers(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  tracker_name text,
  student_name text,
  student_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_activity_user ON public.application_activity (user_id);
CREATE INDEX idx_application_activity_created ON public.application_activity (created_at DESC);
CREATE INDEX idx_application_activity_type ON public.application_activity (activity_type);

GRANT SELECT, INSERT ON public.application_activity TO authenticated;
GRANT ALL ON public.application_activity TO service_role;

ALTER TABLE public.application_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own activity"
  ON public.application_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students read own activity"
  ON public.application_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all activity"
  ON public.application_activity FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. updated_at triggers -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_application_trackers_updated_at
  BEFORE UPDATE ON public.application_trackers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_student_applications_updated_at
  BEFORE UPDATE ON public.student_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Counters + high-intent aggregation -------------------------------------
CREATE OR REPLACE FUNCTION public.increment_tracker_counter(_tracker_id uuid, _field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _field = 'view_count' THEN
    UPDATE public.application_trackers SET view_count = view_count + 1 WHERE id = _tracker_id;
  ELSIF _field = 'apply_click_count' THEN
    UPDATE public.application_trackers SET apply_click_count = apply_click_count + 1 WHERE id = _tracker_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_tracker_counter(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.application_student_summary()
RETURNS TABLE (
  user_id uuid,
  student_name text,
  student_email text,
  views bigint,
  apply_clicks bigint,
  started bigint,
  in_progress bigint,
  completed bigint,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.user_id,
    max(a.student_name) AS student_name,
    max(a.student_email) AS student_email,
    count(*) FILTER (WHERE a.activity_type = 'view') AS views,
    count(*) FILTER (WHERE a.activity_type = 'apply_click') AS apply_clicks,
    (SELECT count(*) FROM public.student_applications s WHERE s.user_id = a.user_id) AS started,
    (SELECT count(*) FROM public.student_applications s WHERE s.user_id = a.user_id AND s.status IN ('started','in_progress')) AS in_progress,
    (SELECT count(*) FROM public.student_applications s WHERE s.user_id = a.user_id AND s.status IN ('submitted','completed','offer_received')) AS completed,
    max(a.created_at) AS last_activity
  FROM public.application_activity a
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY a.user_id
$$;

GRANT EXECUTE ON FUNCTION public.application_student_summary() TO authenticated, service_role;