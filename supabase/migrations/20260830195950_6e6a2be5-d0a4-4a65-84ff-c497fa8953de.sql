-- Fast per-mock question counts (replaces client-side pagination over 20k+ rows)
CREATE OR REPLACE FUNCTION public.mock_question_counts()
RETURNS TABLE(test_id uuid, question_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.test_id, count(q.id) AS question_count
  FROM public.mock_sections s
  LEFT JOIN public.mock_questions q ON q.section_id = s.id
  GROUP BY s.test_id;
$$;

REVOKE ALL ON FUNCTION public.mock_question_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mock_question_counts() TO authenticated, service_role;

-- Fast approximate table row counts for the admin usage dashboard
-- (replaces ~130 exact COUNT(*) scans fired in parallel on every page load)
CREATE OR REPLACE FUNCTION public.admin_table_row_estimates()
RETURNS TABLE(table_name text, row_estimate bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.relname::text,
         GREATEST(c.reltuples, 0)::bigint
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.admin_table_row_estimates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_table_row_estimates() TO authenticated, service_role;