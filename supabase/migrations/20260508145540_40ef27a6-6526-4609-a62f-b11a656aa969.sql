-- Tiny RPC to fetch the current user's leaderboard rank without pulling 500 rows
CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY xp DESC, coins DESC) AS rnk
    FROM public.student_rewards
  )
  SELECT rnk::int FROM ranked WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank() TO anon, authenticated;