-- Public-safe leaderboard function: returns top-N entries per test
-- with display_name from profiles (no emails), bypassing RLS via SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_mock_leaderboard(_test_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  attempt_id uuid,
  user_id uuid,
  display_name text,
  total_score numeric,
  max_score numeric,
  percentile numeric,
  total_correct integer,
  total_attempted integer,
  accuracy numeric,
  submitted_at timestamptz,
  is_self boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.total_score DESC NULLS LAST, a.submitted_at ASC) AS rank,
    a.id AS attempt_id,
    a.user_id,
    COALESCE(NULLIF(p.display_name, ''), 'Anonymous') AS display_name,
    a.total_score,
    a.max_score,
    a.percentile,
    a.total_correct,
    a.total_attempted,
    a.accuracy,
    a.submitted_at,
    (a.user_id = auth.uid()) AS is_self
  FROM public.mock_attempts a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.test_id = _test_id
    AND a.status IN ('submitted','auto_submitted')
    AND a.total_score IS NOT NULL
  ORDER BY a.total_score DESC NULLS LAST, a.submitted_at ASC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_mock_leaderboard(uuid, int) TO anon, authenticated;