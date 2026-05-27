
CREATE INDEX IF NOT EXISTS idx_student_rewards_xp_coins ON public.student_rewards (xp DESC, coins DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_streaks_xp ON public.vocab_streaks (total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_student_notifications_user_created ON public.student_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_user_status_submitted ON public.mock_attempts (user_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_user_submitted ON public.mock_attempts (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_enrollments_user_enrolled ON public.mock_enrollments (user_id, enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_weak_topics_user_level ON public.student_weak_topics (user_id, level);

DROP MATERIALIZED VIEW IF EXISTS public.mv_global_leaderboard CASCADE;
CREATE MATERIALIZED VIEW public.mv_global_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY r.xp DESC, r.coins DESC) AS rank,
  r.user_id,
  COALESCE(NULLIF(s.display_handle,''), 'Aspirant #'||substr(r.user_id::text,1,4)) AS display_handle,
  r.coins, r.xp, r.level, r.streak_days, r.total_mocks_completed
FROM public.student_rewards r
LEFT JOIN public.student_leaderboard_settings s ON s.user_id = r.user_id;
CREATE UNIQUE INDEX IF NOT EXISTS mv_global_leaderboard_user ON public.mv_global_leaderboard (user_id);
CREATE INDEX IF NOT EXISTS mv_global_leaderboard_rank ON public.mv_global_leaderboard (rank);

DROP MATERIALIZED VIEW IF EXISTS public.mv_vocab_leaderboard CASCADE;
CREATE MATERIALIZED VIEW public.mv_vocab_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY s.total_xp DESC) AS rank,
  s.user_id,
  COALESCE(NULLIF(p.display_name,''), 'Aspirant') AS display_name,
  s.total_xp, s.level, s.current_streak
FROM public.vocab_streaks s
LEFT JOIN public.profiles p ON p.user_id = s.user_id;
CREATE UNIQUE INDEX IF NOT EXISTS mv_vocab_leaderboard_user ON public.mv_vocab_leaderboard (user_id);
CREATE INDEX IF NOT EXISTS mv_vocab_leaderboard_rank ON public.mv_vocab_leaderboard (rank);

CREATE OR REPLACE FUNCTION public.get_global_leaderboard(_limit integer DEFAULT 100)
 RETURNS TABLE(rank bigint, user_id uuid, display_handle text, coins integer, xp integer, level integer, streak_days integer, total_mocks_completed integer, is_self boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.rank, m.user_id, m.display_handle, m.coins, m.xp, m.level, m.streak_days, m.total_mocks_completed,
         (m.user_id = auth.uid()) AS is_self
  FROM public.mv_global_leaderboard m
  ORDER BY m.rank
  LIMIT GREATEST(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.get_vocab_leaderboard(_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, total_xp integer, level integer, current_streak integer, is_self boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.rank, m.user_id, m.display_name, m.total_xp, m.level, m.current_streak,
         (m.user_id = auth.uid()) AS is_self
  FROM public.mv_vocab_leaderboard m
  ORDER BY m.rank
  LIMIT GREATEST(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank()
 RETURNS integer
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT rank::int FROM public.mv_global_leaderboard WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_caches()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_global_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_vocab_leaderboard;
END;
$$;
