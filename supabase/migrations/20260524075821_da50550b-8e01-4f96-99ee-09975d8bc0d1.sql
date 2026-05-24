
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE quant_difficulty AS ENUM ('beginner','intermediate','cat','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quant_progress_status AS ENUM ('none','completed','revise_later','mastered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quant_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_slug text,
  description text,
  icon text,
  color text,
  weightage integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quant_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  expression text NOT NULL,
  expression_latex text,
  explanation text NOT NULL DEFAULT '',
  derivation text,
  shortcuts text[] NOT NULL DEFAULT '{}',
  notes text,
  common_mistakes text[] NOT NULL DEFAULT '{}',
  related_slugs text[] NOT NULL DEFAULT '{}',
  topic_slug text NOT NULL,
  difficulty quant_difficulty NOT NULL DEFAULT 'intermediate',
  exam_tags text[] NOT NULL DEFAULT '{}',
  importance smallint NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  is_shortcut boolean NOT NULL DEFAULT false,
  is_high_weightage boolean NOT NULL DEFAULT false,
  frequency_score integer NOT NULL DEFAULT 0,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  seo_keywords text[] NOT NULL DEFAULT '{}',
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quant_formulas_topic ON public.quant_formulas (topic_slug);
CREATE INDEX IF NOT EXISTS idx_quant_formulas_published ON public.quant_formulas (published);
CREATE INDEX IF NOT EXISTS idx_quant_formulas_difficulty ON public.quant_formulas (difficulty);
CREATE INDEX IF NOT EXISTS idx_quant_formulas_name_trgm ON public.quant_formulas USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_quant_formulas_exam_tags ON public.quant_formulas USING gin (exam_tags);

CREATE TABLE IF NOT EXISTS public.quant_formula_progress (
  user_id uuid NOT NULL,
  formula_id uuid NOT NULL REFERENCES public.quant_formulas(id) ON DELETE CASCADE,
  status quant_progress_status NOT NULL DEFAULT 'none',
  bookmarked boolean NOT NULL DEFAULT false,
  times_revised integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  times_attempted integer NOT NULL DEFAULT 0,
  last_revised_at timestamptz,
  next_review_at timestamptz,
  accuracy_pct numeric(5,2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, formula_id)
);

CREATE INDEX IF NOT EXISTS idx_qfp_user ON public.quant_formula_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_qfp_user_status ON public.quant_formula_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_qfp_user_bookmarked ON public.quant_formula_progress (user_id, bookmarked);
CREATE INDEX IF NOT EXISTS idx_qfp_next_review ON public.quant_formula_progress (user_id, next_review_at);

CREATE TABLE IF NOT EXISTS public.quant_revision_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  formula_ids uuid[] NOT NULL DEFAULT '{}',
  completed_ids uuid[] NOT NULL DEFAULT '{}',
  duration_seconds integer NOT NULL DEFAULT 0,
  streak_day integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_date)
);

CREATE TABLE IF NOT EXISTS public.quant_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  daily_target_formulas integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quant_practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  formula_id uuid NOT NULL REFERENCES public.quant_formulas(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index smallint NOT NULL,
  user_answer_index smallint,
  is_correct boolean,
  difficulty quant_difficulty NOT NULL DEFAULT 'intermediate',
  ai_explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qpa_user_formula ON public.quant_practice_attempts (user_id, formula_id);

DROP TRIGGER IF EXISTS trg_qt_updated ON public.quant_topics;
CREATE TRIGGER trg_qt_updated BEFORE UPDATE ON public.quant_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_qf_updated ON public.quant_formulas;
CREATE TRIGGER trg_qf_updated BEFORE UPDATE ON public.quant_formulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_qfp_updated ON public.quant_formula_progress;
CREATE TRIGGER trg_qfp_updated BEFORE UPDATE ON public.quant_formula_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_qrs_updated ON public.quant_revision_sessions;
CREATE TRIGGER trg_qrs_updated BEFORE UPDATE ON public.quant_revision_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_qstr_updated ON public.quant_streaks;
CREATE TRIGGER trg_qstr_updated BEFORE UPDATE ON public.quant_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quant_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_formula_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_revision_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quant_topics_read_all" ON public.quant_topics FOR SELECT USING (true);
CREATE POLICY "quant_topics_admin_write" ON public.quant_topics FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "quant_formulas_read_published" ON public.quant_formulas FOR SELECT
  USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "quant_formulas_admin_write" ON public.quant_formulas FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "qfp_owner_select" ON public.quant_formula_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qfp_owner_insert" ON public.quant_formula_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qfp_owner_update" ON public.quant_formula_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "qfp_owner_delete" ON public.quant_formula_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "qrs_owner_select" ON public.quant_revision_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qrs_owner_insert" ON public.quant_revision_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qrs_owner_update" ON public.quant_revision_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "qstr_owner_select" ON public.quant_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qstr_owner_insert" ON public.quant_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qstr_owner_update" ON public.quant_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "qpa_owner_select" ON public.quant_practice_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qpa_owner_insert" ON public.quant_practice_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_quant_xp(_xp integer, _activity_today boolean DEFAULT true)
RETURNS public.quant_streaks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.quant_streaks;
  _uid uuid := auth.uid();
  _today date := CURRENT_DATE;
  _newstreak integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.quant_streaks (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.quant_streaks WHERE user_id = _uid;
  IF _activity_today THEN
    IF r.last_active_date IS NULL THEN _newstreak := 1;
    ELSIF r.last_active_date = _today THEN _newstreak := r.current_streak;
    ELSIF r.last_active_date = _today - 1 THEN _newstreak := r.current_streak + 1;
    ELSE _newstreak := 1; END IF;
  ELSE _newstreak := r.current_streak; END IF;
  UPDATE public.quant_streaks SET
    total_xp = total_xp + COALESCE(_xp,0),
    level = GREATEST(1, ((total_xp + COALESCE(_xp,0)) / 500) + 1),
    current_streak = _newstreak,
    longest_streak = GREATEST(longest_streak, _newstreak),
    last_active_date = CASE WHEN _activity_today THEN _today ELSE last_active_date END,
    updated_at = now()
  WHERE user_id = _uid RETURNING * INTO r;
  RETURN r;
END; $$;

INSERT INTO public.quant_topics (name, slug, parent_slug, weightage, sort_order, color, icon) VALUES
  ('Arithmetic','arithmetic',NULL,9,10,'#0ea5e9','calculator'),
  ('Percentages','percentages','arithmetic',8,11,'#0ea5e9','percent'),
  ('Profit and Loss','profit-loss','arithmetic',7,12,'#0ea5e9','trending-up'),
  ('Ratio and Proportion','ratio-proportion','arithmetic',7,13,'#0ea5e9','divide'),
  ('Averages','averages','arithmetic',6,14,'#0ea5e9','sigma'),
  ('Mixtures and Alligations','mixtures-alligations','arithmetic',5,15,'#0ea5e9','flask-conical'),
  ('Time, Speed & Distance','time-speed-distance','arithmetic',8,16,'#0ea5e9','gauge'),
  ('Time and Work','time-work','arithmetic',6,17,'#0ea5e9','timer'),
  ('Simple and Compound Interest','interest','arithmetic',6,18,'#0ea5e9','landmark'),
  ('Algebra','algebra',NULL,9,20,'#6366f1','variable'),
  ('Logarithms','logarithms','algebra',5,21,'#6366f1','function-square'),
  ('Functions and Graphs','functions','algebra',5,22,'#6366f1','line-chart'),
  ('Progressions','progressions','algebra',6,23,'#6366f1','trending-up'),
  ('Inequalities','inequalities','algebra',5,24,'#6366f1','chevrons-up-down'),
  ('Geometry','geometry',NULL,8,30,'#10b981','triangle'),
  ('Mensuration','mensuration','geometry',7,31,'#10b981','box'),
  ('Coordinate Geometry','coordinate-geometry','geometry',5,32,'#10b981','axis-3d'),
  ('Trigonometry','trigonometry','geometry',5,33,'#10b981','waves'),
  ('Number System','number-system',NULL,8,40,'#f59e0b','hash'),
  ('Modern Math','modern-math',NULL,7,50,'#a855f7','sparkles'),
  ('Permutation and Combination','permutation-combination','modern-math',7,51,'#a855f7','shuffle'),
  ('Probability','probability','modern-math',6,52,'#a855f7','dice-5'),
  ('Set Theory','set-theory','modern-math',4,53,'#a855f7','venn'),
  ('Statistics','statistics','modern-math',5,54,'#a855f7','bar-chart-3'),
  ('Data Interpretation','data-interpretation',NULL,9,60,'#ef4444','pie-chart'),
  ('Logical Reasoning','logical-reasoning',NULL,7,70,'#ec4899','puzzle')
ON CONFLICT (slug) DO NOTHING;
