-- Question bank
CREATE TABLE public.personalized_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_code text NOT NULL,
  section text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','moderate','difficult')),
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation text,
  topic text,
  source text DEFAULT 'ai',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pq_lookup ON public.personalized_questions(exam_code, section, difficulty);

ALTER TABLE public.personalized_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read questions"
  ON public.personalized_questions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage questions"
  ON public.personalized_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Seen tracking
CREATE TABLE public.personalized_question_seen (
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.personalized_questions(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX idx_pqs_user ON public.personalized_question_seen(user_id);

ALTER TABLE public.personalized_question_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own seen"
  ON public.personalized_question_seen FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "User writes own seen"
  ON public.personalized_question_seen FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read seen"
  ON public.personalized_question_seen FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- Attempts
CREATE TABLE public.personalized_mock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_code text NOT NULL,
  sections text[] NOT NULL,
  difficulty text NOT NULL,
  num_questions int NOT NULL,
  duration_minutes int NOT NULL,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','abandoned')),
  total_correct int DEFAULT 0,
  total_wrong int DEFAULT 0,
  total_unattempted int DEFAULT 0,
  score numeric DEFAULT 0,
  accuracy numeric DEFAULT 0,
  time_taken_seconds int DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pma_user ON public.personalized_mock_attempts(user_id, created_at DESC);

ALTER TABLE public.personalized_mock_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own attempts"
  ON public.personalized_mock_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all attempts"
  ON public.personalized_mock_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- Access grants
CREATE TABLE public.personalized_hub_access (
  user_id uuid PRIMARY KEY,
  daily_quota int NOT NULL DEFAULT 5,
  expires_at timestamptz,
  source text DEFAULT 'admin',
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personalized_hub_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own access"
  ON public.personalized_hub_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage access"
  ON public.personalized_hub_access FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Update timestamp triggers
CREATE TRIGGER trg_pq_updated BEFORE UPDATE ON public.personalized_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pma_updated BEFORE UPDATE ON public.personalized_mock_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pha_updated BEFORE UPDATE ON public.personalized_hub_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: pick fresh questions for a user
CREATE OR REPLACE FUNCTION public.pick_personalized_questions(
  _user_id uuid,
  _exam_code text,
  _sections text[],
  _difficulty text,
  _count int
) RETURNS SETOF public.personalized_questions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT q.* FROM public.personalized_questions q
  WHERE q.exam_code = _exam_code
    AND q.section = ANY(_sections)
    AND (_difficulty = 'mixed' OR q.difficulty = _difficulty)
    AND NOT EXISTS (
      SELECT 1 FROM public.personalized_question_seen s
      WHERE s.user_id = _user_id AND s.question_id = q.id
    )
  ORDER BY random()
  LIMIT GREATEST(_count,1);
$$;

-- Today's usage count for quota check
CREATE OR REPLACE FUNCTION public.personalized_hub_today_count(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COUNT(*)::int FROM public.personalized_mock_attempts
  WHERE user_id = _user_id AND created_at::date = CURRENT_DATE;
$$;