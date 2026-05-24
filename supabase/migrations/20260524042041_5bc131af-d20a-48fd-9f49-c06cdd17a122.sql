
-- ============= ENUMS =============
DO $$ BEGIN
  CREATE TYPE public.vocab_category AS ENUM ('finance','marketing','consulting','hr','economics','corp_comm','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vocab_difficulty AS ENUM ('beginner','intermediate','cat','gdpi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vocab_quiz_type AS ENUM ('mcq','fill','synonym','correction','context');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= TABLES =============
CREATE TABLE IF NOT EXISTS public.vocab_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  part_of_speech text,
  meaning text NOT NULL,
  hinglish_meaning text,
  pronunciation text,
  synonyms text[] NOT NULL DEFAULT '{}',
  antonyms text[] NOT NULL DEFAULT '{}',
  example_business text,
  example_interview text,
  example_email text,
  category public.vocab_category NOT NULL DEFAULT 'general',
  difficulty public.vocab_difficulty NOT NULL DEFAULT 'intermediate',
  source text NOT NULL DEFAULT 'seed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vocab_words_cat ON public.vocab_words(category);
CREATE INDEX IF NOT EXISTS idx_vocab_words_diff ON public.vocab_words(difficulty);

CREATE TABLE IF NOT EXISTS public.vocab_word_of_day (
  on_date date PRIMARY KEY,
  word_id uuid NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vocab_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
CREATE INDEX IF NOT EXISTS idx_vocab_bookmarks_user ON public.vocab_bookmarks(user_id);

CREATE TABLE IF NOT EXISTS public.vocab_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  mastery smallint NOT NULL DEFAULT 0,
  times_seen integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_due ON public.vocab_progress(user_id, next_review_at);

CREATE TABLE IF NOT EXISTS public.vocab_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  quiz_type public.vocab_quiz_type NOT NULL,
  is_correct boolean NOT NULL,
  time_taken_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vocab_quiz_user ON public.vocab_quiz_attempts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vocab_daily_goals (
  user_id uuid NOT NULL,
  on_date date NOT NULL,
  words_target integer NOT NULL DEFAULT 5,
  words_done integer NOT NULL DEFAULT 0,
  quiz_target integer NOT NULL DEFAULT 10,
  quiz_done integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, on_date)
);

CREATE TABLE IF NOT EXISTS public.vocab_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============= TRIGGERS =============
CREATE TRIGGER trg_vocab_words_updated
BEFORE UPDATE ON public.vocab_words
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_vocab_progress_updated
BEFORE UPDATE ON public.vocab_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= RLS =============
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_word_of_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_streaks ENABLE ROW LEVEL SECURITY;

-- vocab_words: public read, admin write
CREATE POLICY "vocab_words_read_all" ON public.vocab_words FOR SELECT USING (true);
CREATE POLICY "vocab_words_admin_write" ON public.vocab_words FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- vocab_word_of_day: public read, admin write
CREATE POLICY "vocab_wotd_read_all" ON public.vocab_word_of_day FOR SELECT USING (true);
CREATE POLICY "vocab_wotd_admin_write" ON public.vocab_word_of_day FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- vocab_bookmarks: owner-only
CREATE POLICY "vocab_bookmarks_owner_select" ON public.vocab_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vocab_bookmarks_owner_insert" ON public.vocab_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vocab_bookmarks_owner_update" ON public.vocab_bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vocab_bookmarks_owner_delete" ON public.vocab_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- vocab_progress: owner-only
CREATE POLICY "vocab_progress_owner_select" ON public.vocab_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vocab_progress_owner_insert" ON public.vocab_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vocab_progress_owner_update" ON public.vocab_progress FOR UPDATE USING (auth.uid() = user_id);

-- vocab_quiz_attempts: owner-only
CREATE POLICY "vocab_quiz_owner_select" ON public.vocab_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vocab_quiz_owner_insert" ON public.vocab_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- vocab_daily_goals: owner-only
CREATE POLICY "vocab_goals_owner_select" ON public.vocab_daily_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vocab_goals_owner_upsert" ON public.vocab_daily_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vocab_goals_owner_update" ON public.vocab_daily_goals FOR UPDATE USING (auth.uid() = user_id);

-- vocab_streaks: owner read, leaderboard read via security definer fn; updates via fn
CREATE POLICY "vocab_streaks_owner_select" ON public.vocab_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vocab_streaks_owner_insert" ON public.vocab_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vocab_streaks_owner_update" ON public.vocab_streaks FOR UPDATE USING (auth.uid() = user_id);

-- ============= FUNCTIONS =============

-- Words due for review (spaced repetition queue)
CREATE OR REPLACE FUNCTION public.vocab_due_for_review(_user_id uuid, _limit integer DEFAULT 10)
RETURNS SETOF public.vocab_words
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.* FROM public.vocab_words w
  JOIN public.vocab_progress p ON p.word_id = w.id
  WHERE p.user_id = _user_id AND p.next_review_at <= now()
  ORDER BY p.next_review_at ASC
  LIMIT GREATEST(_limit, 1);
$$;

-- Award XP + update streak atomically (caller must be the user)
CREATE OR REPLACE FUNCTION public.award_vocab_xp(_xp integer, _activity_today boolean DEFAULT true)
RETURNS public.vocab_streaks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.vocab_streaks;
  _uid uuid := auth.uid();
  _today date := CURRENT_DATE;
  _newstreak integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.vocab_streaks (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.vocab_streaks WHERE user_id = _uid;
  IF _activity_today THEN
    IF r.last_active_date IS NULL THEN _newstreak := 1;
    ELSIF r.last_active_date = _today THEN _newstreak := r.current_streak;
    ELSIF r.last_active_date = _today - 1 THEN _newstreak := r.current_streak + 1;
    ELSE _newstreak := 1; END IF;
  ELSE _newstreak := r.current_streak; END IF;
  UPDATE public.vocab_streaks SET
    total_xp = total_xp + COALESCE(_xp,0),
    level = GREATEST(1, ((total_xp + COALESCE(_xp,0)) / 500) + 1),
    current_streak = _newstreak,
    longest_streak = GREATEST(longest_streak, _newstreak),
    last_active_date = CASE WHEN _activity_today THEN _today ELSE last_active_date END,
    updated_at = now()
  WHERE user_id = _uid RETURNING * INTO r;
  RETURN r;
END; $$;

-- Update progress + spaced repetition schedule (SM-2 lite)
CREATE OR REPLACE FUNCTION public.vocab_update_progress(_word_id uuid, _correct boolean)
RETURNS public.vocab_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.vocab_progress;
  _uid uuid := auth.uid();
  _interval interval;
  _new_mastery smallint;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.vocab_progress (user_id, word_id)
  VALUES (_uid, _word_id)
  ON CONFLICT (user_id, word_id) DO NOTHING;
  SELECT * INTO r FROM public.vocab_progress WHERE user_id = _uid AND word_id = _word_id;
  IF _correct THEN
    _new_mastery := LEAST(r.mastery + 1, 5);
  ELSE
    _new_mastery := GREATEST(r.mastery - 1, 0);
  END IF;
  _interval := CASE _new_mastery
    WHEN 0 THEN interval '1 day'
    WHEN 1 THEN interval '2 days'
    WHEN 2 THEN interval '4 days'
    WHEN 3 THEN interval '7 days'
    WHEN 4 THEN interval '14 days'
    ELSE interval '30 days' END;
  UPDATE public.vocab_progress SET
    mastery = _new_mastery,
    times_seen = times_seen + 1,
    times_correct = times_correct + CASE WHEN _correct THEN 1 ELSE 0 END,
    last_seen_at = now(),
    next_review_at = now() + _interval,
    updated_at = now()
  WHERE user_id = _uid AND word_id = _word_id RETURNING * INTO r;
  RETURN r;
END; $$;

-- Leaderboard
CREATE OR REPLACE FUNCTION public.get_vocab_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(rank bigint, user_id uuid, display_name text, total_xp integer, level integer, current_streak integer, is_self boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROW_NUMBER() OVER (ORDER BY s.total_xp DESC) AS rank,
    s.user_id,
    COALESCE(NULLIF(p.display_name,''), 'Aspirant') AS display_name,
    s.total_xp, s.level, s.current_streak,
    (s.user_id = auth.uid()) AS is_self
  FROM public.vocab_streaks s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  ORDER BY s.total_xp DESC
  LIMIT GREATEST(_limit,1);
$$;
