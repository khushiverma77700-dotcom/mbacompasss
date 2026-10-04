CREATE OR REPLACE FUNCTION public.get_mock_benchmarks(_test_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  test_id uuid,
  verified_students bigint,
  cohort_average numeric,
  cohort_median numeric,
  top_10_score numeric,
  topper_score numeric,
  my_attempt_id uuid,
  my_score numeric,
  my_rank bigint,
  my_percentile numeric,
  is_provisional boolean,
  difficulty text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    SELECT
      a.id, a.test_id, a.user_id, a.total_score, a.max_score, a.submitted_at,
      ROW_NUMBER() OVER (
        PARTITION BY a.test_id, a.user_id
        ORDER BY a.submitted_at ASC NULLS LAST, a.id ASC
      ) AS attempt_number
    FROM public.mock_attempts a
    WHERE a.status IN ('submitted', 'auto_submitted')
      AND a.total_score IS NOT NULL
      AND (_test_ids IS NULL OR a.test_id = ANY(_test_ids))
  ),
  cohort AS (
    SELECT * FROM eligible WHERE attempt_number = 1
  ),
  ranked AS (
    SELECT
      c.*,
      RANK() OVER (PARTITION BY c.test_id ORDER BY c.total_score DESC) AS competition_rank,
      COUNT(*) OVER (PARTITION BY c.test_id, c.total_score) AS tied_count,
      COUNT(*) OVER (PARTITION BY c.test_id) AS cohort_size,
      (SELECT COUNT(*) FROM cohort lower_row WHERE lower_row.test_id = c.test_id AND lower_row.total_score < c.total_score) AS lower_count
    FROM cohort c
  ),
  aggregates AS (
    SELECT
      c.test_id,
      COUNT(*) AS verified_students,
      ROUND(AVG(c.total_score), 2) AS cohort_average,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.total_score)::numeric, 2) AS cohort_median,
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY c.total_score)::numeric, 2) AS top_10_score,
      MAX(c.total_score) AS topper_score,
      CASE
        WHEN AVG(c.total_score / NULLIF(c.max_score, 0)) >= 0.62 THEN 'Easy'
        WHEN AVG(c.total_score / NULLIF(c.max_score, 0)) >= 0.45 THEN 'Moderate'
        WHEN AVG(c.total_score / NULLIF(c.max_score, 0)) >= 0.30 THEN 'Moderate-Hard'
        ELSE 'Hard'
      END AS difficulty
    FROM cohort c
    GROUP BY c.test_id
  )
  SELECT
    ag.test_id, ag.verified_students, ag.cohort_average, ag.cohort_median,
    ag.top_10_score, ag.topper_score, me.id AS my_attempt_id,
    me.total_score AS my_score, me.competition_rank AS my_rank,
    CASE
      WHEN me.id IS NULL OR ag.verified_students < 2 THEN NULL
      ELSE ROUND(((me.lower_count + ((me.tied_count - 1)::numeric / 2)) / ag.verified_students::numeric) * 100, 2)
    END AS my_percentile,
    (ag.verified_students < 30) AS is_provisional,
    ag.difficulty
  FROM aggregates ag
  LEFT JOIN ranked me ON me.test_id = ag.test_id AND me.user_id = auth.uid()
  ORDER BY ag.test_id;
$$;

REVOKE ALL ON FUNCTION public.get_mock_benchmarks(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mock_benchmarks(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mock_leaderboard_v2(_test_id uuid, _limit int DEFAULT 100)
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
  is_self boolean,
  verified_students bigint,
  is_provisional boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_attempts AS (
    SELECT DISTINCT ON (a.user_id)
      a.id, a.user_id, a.total_score, a.max_score, a.total_correct,
      a.total_attempted, a.accuracy, a.submitted_at
    FROM public.mock_attempts a
    WHERE a.test_id = _test_id
      AND a.status IN ('submitted', 'auto_submitted')
      AND a.total_score IS NOT NULL
    ORDER BY a.user_id, a.submitted_at ASC NULLS LAST, a.id ASC
  ),
  scored AS (
    SELECT
      fa.*,
      RANK() OVER (ORDER BY fa.total_score DESC) AS competition_rank,
      COUNT(*) OVER () AS cohort_size,
      COUNT(*) OVER (PARTITION BY fa.total_score) AS tied_count,
      (SELECT COUNT(*) FROM first_attempts lower_row WHERE lower_row.total_score < fa.total_score) AS lower_count
    FROM first_attempts fa
  )
  SELECT
    s.competition_rank AS rank,
    s.id AS attempt_id,
    s.user_id,
    COALESCE(NULLIF(p.display_name, ''), 'Aspirant') AS display_name,
    s.total_score,
    s.max_score,
    CASE
      WHEN s.cohort_size < 2 THEN NULL
      ELSE ROUND(((s.lower_count + ((s.tied_count - 1)::numeric / 2)) / s.cohort_size::numeric) * 100, 2)
    END AS percentile,
    s.total_correct,
    s.total_attempted,
    s.accuracy,
    s.submitted_at,
    (s.user_id = auth.uid()) AS is_self,
    s.cohort_size AS verified_students,
    (s.cohort_size < 30) AS is_provisional
  FROM scored s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  ORDER BY s.competition_rank, s.submitted_at ASC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_mock_leaderboard_v2(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mock_leaderboard_v2(uuid, int) TO authenticated;