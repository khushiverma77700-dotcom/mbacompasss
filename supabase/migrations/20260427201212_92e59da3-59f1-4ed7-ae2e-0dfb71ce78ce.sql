-- Default all students to public on the leaderboard
ALTER TABLE public.student_leaderboard_settings ALTER COLUMN is_public SET DEFAULT true;
UPDATE public.student_leaderboard_settings SET is_public = true WHERE is_public = false;

-- Replace leaderboard function: include ALL students with rewards, not just opted-in ones
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(_limit integer DEFAULT 100)
 RETURNS TABLE(rank bigint, user_id uuid, display_handle text, coins integer, xp integer, level integer, streak_days integer, total_mocks_completed integer, is_self boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ROW_NUMBER() OVER (ORDER BY r.xp DESC, r.coins DESC) AS rank,
    r.user_id,
    COALESCE(NULLIF(s.display_handle,''), 'Aspirant #'||substr(r.user_id::text,1,4)) AS display_handle,
    r.coins, r.xp, r.level, r.streak_days, r.total_mocks_completed,
    (r.user_id = auth.uid()) AS is_self
  FROM public.student_rewards r
  LEFT JOIN public.student_leaderboard_settings s ON s.user_id = r.user_id
  ORDER BY r.xp DESC, r.coins DESC
  LIMIT GREATEST(_limit,1);
$function$;