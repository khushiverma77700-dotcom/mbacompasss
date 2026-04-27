
-- Leaderboard settings (created first - referenced by others)
CREATE TABLE public.student_leaderboard_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  is_public BOOLEAN NOT NULL DEFAULT false,
  display_handle TEXT,
  target_percentile NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_leaderboard_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own LB settings" ON public.student_leaderboard_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read LB settings" ON public.student_leaderboard_settings FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Admins manage LB settings" ON public.student_leaderboard_settings FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.student_rewards (
  user_id UUID NOT NULL PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_mocks_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own rewards" ON public.student_rewards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage rewards" ON public.student_rewards FOR ALL USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Public read rewards opt-in" ON public.student_rewards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.student_leaderboard_settings s WHERE s.user_id = student_rewards.user_id AND s.is_public = true)
);

CREATE TABLE public.student_badges (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_key TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  icon TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own badges" ON public.student_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage badges" ON public.student_badges FOR ALL USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Public read badges opt-in" ON public.student_badges FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.student_leaderboard_settings s WHERE s.user_id = student_badges.user_id AND s.is_public = true)
);

CREATE TABLE public.student_notifications (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own notifications" ON public.student_notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage notifications" ON public.student_notifications FOR ALL USING (has_role(auth.uid(),'admin'));
CREATE INDEX idx_notifications_user_unread ON public.student_notifications(user_id, is_read, created_at DESC);

CREATE TABLE public.mock_orders (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  coupon_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.mock_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders" ON public.mock_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage orders" ON public.mock_orders FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.mock_order_items (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.mock_orders(id) ON DELETE CASCADE,
  test_id UUID,
  item_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order items" ON public.mock_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.mock_orders o WHERE o.id = mock_order_items.order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Users insert own order items" ON public.mock_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.mock_orders o WHERE o.id = mock_order_items.order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Admins manage order items" ON public.mock_order_items FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.mock_ai_deep_analyses (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  attempt_id UUID NOT NULL UNIQUE,
  test_id UUID,
  summary TEXT,
  why_lost_marks JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  mistake_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  topic_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_ai_deep_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own deep analyses" ON public.mock_ai_deep_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage deep analyses" ON public.mock_ai_deep_analyses FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.award_student_rewards(_user_id UUID, _coins INTEGER, _xp INTEGER, _activity_today BOOLEAN DEFAULT true)
RETURNS public.student_rewards
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.student_rewards; _today DATE := CURRENT_DATE; _newstreak INTEGER;
BEGIN
  INSERT INTO public.student_rewards (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.student_rewards WHERE user_id = _user_id;
  IF _activity_today THEN
    IF r.last_activity_date IS NULL THEN _newstreak := 1;
    ELSIF r.last_activity_date = _today THEN _newstreak := r.streak_days;
    ELSIF r.last_activity_date = _today - 1 THEN _newstreak := r.streak_days + 1;
    ELSE _newstreak := 1; END IF;
  ELSE _newstreak := r.streak_days; END IF;
  UPDATE public.student_rewards SET
    coins = coins + COALESCE(_coins,0),
    xp = xp + COALESCE(_xp,0),
    level = GREATEST(1, ((xp + COALESCE(_xp,0)) / 500) + 1),
    streak_days = _newstreak,
    longest_streak = GREATEST(longest_streak, _newstreak),
    last_activity_date = CASE WHEN _activity_today THEN _today ELSE last_activity_date END,
    updated_at = now()
  WHERE user_id = _user_id RETURNING * INTO r;
  RETURN r;
END; $$;

CREATE OR REPLACE FUNCTION public.get_global_leaderboard(_limit INTEGER DEFAULT 100)
RETURNS TABLE(rank BIGINT, user_id UUID, display_handle TEXT, coins INTEGER, xp INTEGER, level INTEGER, streak_days INTEGER, total_mocks_completed INTEGER, is_self BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ROW_NUMBER() OVER (ORDER BY r.xp DESC, r.coins DESC) AS rank,
    r.user_id,
    COALESCE(NULLIF(s.display_handle,''), 'Aspirant #'||substr(r.user_id::text,1,4)) AS display_handle,
    r.coins, r.xp, r.level, r.streak_days, r.total_mocks_completed,
    (r.user_id = auth.uid()) AS is_self
  FROM public.student_rewards r
  JOIN public.student_leaderboard_settings s ON s.user_id = r.user_id AND s.is_public = true
  ORDER BY r.xp DESC, r.coins DESC
  LIMIT GREATEST(_limit,1);
$$;
