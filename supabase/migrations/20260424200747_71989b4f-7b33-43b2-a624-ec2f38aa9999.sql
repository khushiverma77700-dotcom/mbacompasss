-- Recreate the leaderboard view with security_invoker so RLS of mock_attempts
-- is enforced based on the querying user, not the view owner.
DROP VIEW IF EXISTS public.mock_leaderboard;

CREATE VIEW public.mock_leaderboard
WITH (security_invoker = true) AS
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