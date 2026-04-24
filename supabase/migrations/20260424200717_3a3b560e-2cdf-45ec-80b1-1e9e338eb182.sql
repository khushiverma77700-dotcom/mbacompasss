-- =========================================================================
-- CAT Mock Test System — Full Schema
-- =========================================================================

-- ---------- Enums ----------
CREATE TYPE public.mock_test_type AS ENUM ('full_length', 'sectional', 'topic');
CREATE TYPE public.mock_section_code AS ENUM ('VARC', 'DILR', 'QA');
CREATE TYPE public.mock_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.mock_question_type AS ENUM ('mcq', 'tita');
CREATE TYPE public.mock_pricing_type AS ENUM ('free', 'paid');
CREATE TYPE public.mock_attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'abandoned');
CREATE TYPE public.mock_response_status AS ENUM ('not_visited', 'not_answered', 'answered', 'marked', 'answered_marked');
CREATE TYPE public.mock_payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ---------- Mock tests ----------
CREATE TABLE public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  banner_url text,
  test_type public.mock_test_type NOT NULL DEFAULT 'full_length',
  total_duration_minutes integer NOT NULL DEFAULT 120,
  pricing_type public.mock_pricing_type NOT NULL DEFAULT 'free',
  price_inr numeric(10,2) NOT NULL DEFAULT 0,
  stripe_price_id text,
  access_validity_days integer NOT NULL DEFAULT 30,
  difficulty public.mock_difficulty NOT NULL DEFAULT 'medium',
  is_published boolean NOT NULL DEFAULT false,
  is_live boolean NOT NULL DEFAULT false,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  total_attempts integer NOT NULL DEFAULT 0,
  total_takers integer NOT NULL DEFAULT 0,
  meta_title text,
  meta_description text,
  keywords text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mock_tests_published ON public.mock_tests(is_published, created_at DESC);

-- ---------- Sections per mock ----------
CREATE TABLE public.mock_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  code public.mock_section_code NOT NULL,
  name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 40,
  total_questions integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, code)
);
CREATE INDEX idx_mock_sections_test ON public.mock_sections(test_id, sort_order);

-- ---------- Passages / DILR sets (shared content) ----------
CREATE TABLE public.mock_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.mock_sections(id) ON DELETE CASCADE,
  title text,
  content_html text NOT NULL,
  image_urls text[] DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mock_passages_section ON public.mock_passages(section_id, sort_order);

-- ---------- Questions ----------
CREATE TABLE public.mock_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.mock_sections(id) ON DELETE CASCADE,
  passage_id uuid REFERENCES public.mock_passages(id) ON DELETE SET NULL,
  question_number integer NOT NULL,
  question_type public.mock_question_type NOT NULL DEFAULT 'mcq',
  question_html text NOT NULL,
  image_urls text[] DEFAULT '{}',
  -- For MCQ: options live in mock_question_options
  -- For TITA:
  tita_correct_answers text[] DEFAULT '{}',  -- accepts multiple acceptable strings
  tita_numeric_tolerance numeric,             -- optional ± for numeric TITA
  positive_marks numeric(5,2) NOT NULL DEFAULT 3,
  negative_marks numeric(5,2) NOT NULL DEFAULT 1,
  difficulty public.mock_difficulty NOT NULL DEFAULT 'medium',
  topic text,
  subtopic text,
  past_year_reference text,
  explanation_html text,
  solution_video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, question_number)
);
CREATE INDEX idx_mock_questions_section ON public.mock_questions(section_id, question_number);
CREATE INDEX idx_mock_questions_passage ON public.mock_questions(passage_id);

-- ---------- MCQ options ----------
CREATE TABLE public.mock_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.mock_questions(id) ON DELETE CASCADE,
  option_label text NOT NULL,    -- 'A','B','C','D'
  option_html text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (question_id, option_label)
);
CREATE INDEX idx_mock_options_question ON public.mock_question_options(question_id);

-- ---------- Enrollments (free or after purchase) ----------
CREATE TABLE public.mock_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source text NOT NULL DEFAULT 'free',  -- free | paid | coupon | admin_grant
  coupon_code text,
  UNIQUE (user_id, test_id)
);
CREATE INDEX idx_mock_enrollments_user ON public.mock_enrollments(user_id);

-- ---------- Payments ----------
CREATE TABLE public.mock_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE RESTRICT,
  amount_inr numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status public.mock_payment_status NOT NULL DEFAULT 'pending',
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  coupon_code text,
  discount_inr numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mock_payments_user ON public.mock_payments(user_id);
CREATE INDEX idx_mock_payments_status ON public.mock_payments(status);

-- ---------- Coupons ----------
CREATE TABLE public.mock_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  test_id uuid REFERENCES public.mock_tests(id) ON DELETE CASCADE, -- null = all
  discount_percent numeric(5,2),
  discount_flat_inr numeric(10,2),
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Attempts ----------
CREATE TABLE public.mock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  status public.mock_attempt_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  current_section_id uuid REFERENCES public.mock_sections(id),
  -- Server-side timer authority: section deadlines (jsonb of section_id -> ISO ts)
  section_deadlines jsonb NOT NULL DEFAULT '{}',
  overall_deadline timestamptz,
  -- Anti-cheat
  tab_switch_count integer NOT NULL DEFAULT 0,
  fullscreen_exits integer NOT NULL DEFAULT 0,
  auto_submitted_reason text,
  -- Scoring (filled by edge function on submit)
  total_score numeric(7,2),
  max_score numeric(7,2),
  sectional_scores jsonb DEFAULT '{}',  -- { VARC: {score, attempted, correct, ...}, ... }
  total_attempted integer DEFAULT 0,
  total_correct integer DEFAULT 0,
  total_incorrect integer DEFAULT 0,
  accuracy numeric(5,2),
  percentile numeric(5,2),
  all_india_rank integer,
  topic_breakdown jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mock_attempts_user ON public.mock_attempts(user_id, started_at DESC);
CREATE INDEX idx_mock_attempts_test_status ON public.mock_attempts(test_id, status);

-- ---------- Per-question responses (auto-saved during test) ----------
CREATE TABLE public.mock_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.mock_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.mock_questions(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.mock_sections(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.mock_question_options(id),
  tita_answer text,
  status public.mock_response_status NOT NULL DEFAULT 'not_visited',
  is_correct boolean,
  marks_awarded numeric(5,2) DEFAULT 0,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  visit_count integer NOT NULL DEFAULT 0,
  first_visited_at timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
CREATE INDEX idx_mock_responses_attempt ON public.mock_responses(attempt_id);

-- ---------- Bookmarks ----------
CREATE TABLE public.mock_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.mock_questions(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
CREATE INDEX idx_mock_bookmarks_user ON public.mock_bookmarks(user_id);

-- =========================================================================
-- updated_at triggers
-- =========================================================================
CREATE TRIGGER trg_mock_tests_updated BEFORE UPDATE ON public.mock_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mock_questions_updated BEFORE UPDATE ON public.mock_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mock_payments_updated BEFORE UPDATE ON public.mock_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mock_attempts_updated BEFORE UPDATE ON public.mock_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- Helper: does the user have an active enrollment for a test?
-- =========================================================================
CREATE OR REPLACE FUNCTION public.user_has_mock_access(_user_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mock_enrollments
    WHERE user_id = _user_id
      AND test_id = _test_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_bookmarks ENABLE ROW LEVEL SECURITY;

-- ---- mock_tests: published visible to all; admins manage
CREATE POLICY "Published mocks viewable by everyone"
  ON public.mock_tests FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage mock_tests"
  ON public.mock_tests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- mock_sections: visible if parent test is published; admins manage
CREATE POLICY "Sections viewable for published tests"
  ON public.mock_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.mock_tests t WHERE t.id = test_id AND t.is_published = true));
CREATE POLICY "Admins manage mock_sections"
  ON public.mock_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- passages: only enrolled users (during test) or admins can SELECT
CREATE POLICY "Enrolled users view passages"
  ON public.mock_passages FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.mock_sections s
      WHERE s.id = section_id
        AND public.user_has_mock_access(auth.uid(), s.test_id)
    )
  );
CREATE POLICY "Admins manage mock_passages"
  ON public.mock_passages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- questions: only enrolled users or admins (NEVER expose answers via direct SELECT)
-- We'll expose questions via edge function that strips correct answers during the test,
-- and returns full data only after submit. RLS still requires enrollment.
CREATE POLICY "Enrolled users view questions"
  ON public.mock_questions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.mock_sections s
      WHERE s.id = section_id
        AND public.user_has_mock_access(auth.uid(), s.test_id)
    )
  );
CREATE POLICY "Admins manage mock_questions"
  ON public.mock_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- options: SAME as questions but DO NOT expose is_correct via client.
-- Enforced by serving questions through edge function that omits is_correct.
-- Admins manage; enrolled users can SELECT (we'll filter is_correct client-side via RPC).
CREATE POLICY "Enrolled users view options"
  ON public.mock_question_options FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.mock_questions q
      JOIN public.mock_sections s ON s.id = q.section_id
      WHERE q.id = question_id
        AND public.user_has_mock_access(auth.uid(), s.test_id)
    )
  );
CREATE POLICY "Admins manage mock_question_options"
  ON public.mock_question_options FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- enrollments
CREATE POLICY "Users view own enrollments"
  ON public.mock_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users self-enroll free mocks"
  ON public.mock_enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.mock_tests t WHERE t.id = test_id AND t.pricing_type = 'free' AND t.is_published = true)
  );
CREATE POLICY "Admins manage enrollments"
  ON public.mock_enrollments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- payments
CREATE POLICY "Users view own payments"
  ON public.mock_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage payments"
  ON public.mock_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- coupons (active codes are visible so frontend can validate; admins manage)
CREATE POLICY "Active coupons readable"
  ON public.mock_coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins manage coupons"
  ON public.mock_coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- attempts (own only; admins all)
CREATE POLICY "Users view own attempts"
  ON public.mock_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own attempts"
  ON public.mock_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_mock_access(auth.uid(), test_id));
CREATE POLICY "Users update own in-progress attempts"
  ON public.mock_attempts FOR UPDATE
  USING (auth.uid() = user_id AND status = 'in_progress')
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage attempts"
  ON public.mock_attempts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- responses (own only; admins all)
CREATE POLICY "Users view own responses"
  ON public.mock_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));
CREATE POLICY "Users insert own responses"
  ON public.mock_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid() AND a.status = 'in_progress'));
CREATE POLICY "Users update own responses"
  ON public.mock_responses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid() AND a.status = 'in_progress'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins manage responses"
  ON public.mock_responses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- bookmarks
CREATE POLICY "Users manage own bookmarks"
  ON public.mock_bookmarks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view bookmarks"
  ON public.mock_bookmarks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- Leaderboard view (top scorers per test)
-- =========================================================================
CREATE OR REPLACE VIEW public.mock_leaderboard AS
SELECT
  a.test_id,
  a.user_id,
  a.id AS attempt_id,
  a.total_score,
  a.percentile,
  a.all_india_rank,
  a.submitted_at,
  ROW_NUMBER() OVER (PARTITION BY a.test_id ORDER BY a.total_score DESC NULLS LAST, a.submitted_at ASC) AS rank
FROM public.mock_attempts a
WHERE a.status IN ('submitted','auto_submitted')
  AND a.total_score IS NOT NULL;