-- 1. Shortlister submissions: secure save path for visitors and signed-in users
CREATE OR REPLACE FUNCTION public.save_shortlister_submission(
  p_submission_id uuid,
  p_status text,
  p_form_data jsonb,
  p_payload jsonb,
  p_results_count integer,
  p_email text,
  p_full_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('login_incomplete','completed') THEN
    RAISE EXCEPTION 'invalid submission status';
  END IF;

  IF p_submission_id IS NOT NULL THEN
    UPDATE public.shortlister_submissions s
       SET status = p_status,
           form_data = COALESCE(p_form_data, '{}'::jsonb),
           payload = p_payload,
           results_count = p_results_count,
           email = COALESCE(p_email, s.email),
           full_name = COALESCE(p_full_name, s.full_name),
           user_id = COALESCE(v_uid, s.user_id),
           updated_at = now()
     WHERE s.id = p_submission_id
       AND (s.user_id IS NULL OR s.user_id = v_uid)
    RETURNING s.id INTO v_id;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO public.shortlister_submissions (user_id, status, form_data, payload, results_count, email, full_name)
  VALUES (v_uid, p_status, COALESCE(p_form_data, '{}'::jsonb), p_payload, p_results_count, p_email, p_full_name)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_shortlister_submission(uuid,text,jsonb,jsonb,integer,text,text) TO anon, authenticated;

-- 2. Exam generation jobs: explicit review lifecycle
ALTER TABLE public.exam_generation_jobs
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS draft_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.exam_generation_jobs
  DROP CONSTRAINT IF EXISTS exam_generation_jobs_review_status_check;
ALTER TABLE public.exam_generation_jobs
  ADD CONSTRAINT exam_generation_jobs_review_status_check
  CHECK (review_status IN ('pending','accepted','rejected','published'));

CREATE INDEX IF NOT EXISTS exam_generation_jobs_review_status_idx
  ON public.exam_generation_jobs (review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS exam_generation_jobs_draft_idx
  ON public.exam_generation_jobs (draft_id);

-- 3. Admin listing indexes
CREATE INDEX IF NOT EXISTS colleges_name_trgm_idx ON public.colleges USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS colleges_slug_trgm_idx ON public.colleges USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS colleges_city_trgm_idx ON public.colleges USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS colleges_tier_idx ON public.colleges (tier);
CREATE INDEX IF NOT EXISTS colleges_category_idx ON public.colleges (college_category);
CREATE INDEX IF NOT EXISTS colleges_type_idx ON public.colleges (type);
CREATE INDEX IF NOT EXISTS colleges_state_city_idx ON public.colleges (state, city);
CREATE INDEX IF NOT EXISTS colleges_listing_order_idx ON public.colleges (listing_sort_order NULLS LAST, ranking);

CREATE INDEX IF NOT EXISTS articles_title_trgm_idx ON public.articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_category_idx ON public.articles (category);
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON public.articles (created_at DESC);
CREATE INDEX IF NOT EXISTS articles_published_idx ON public.articles (published, created_at DESC);

CREATE INDEX IF NOT EXISTS cta_events_created_at_idx ON public.cta_events (created_at DESC);
CREATE INDEX IF NOT EXISTS cta_events_key_created_idx ON public.cta_events (cta_key, created_at DESC);

-- 4. College filter dropdown values, computed server-side
CREATE OR REPLACE FUNCTION public.admin_college_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tiers',  (SELECT COALESCE(jsonb_agg(DISTINCT tier ORDER BY tier), '[]'::jsonb) FROM public.colleges WHERE COALESCE(tier,'') <> ''),
    'types',  (SELECT COALESCE(jsonb_agg(DISTINCT type ORDER BY type), '[]'::jsonb) FROM public.colleges WHERE COALESCE(type,'') <> ''),
    'states', (SELECT COALESCE(jsonb_agg(DISTINCT state ORDER BY state), '[]'::jsonb) FROM public.colleges WHERE COALESCE(state,'') <> ''),
    'cities', (SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb), '[]'::jsonb)
                 FROM (SELECT DISTINCT city, state FROM public.colleges WHERE COALESCE(city,'') <> '' ORDER BY city) c)
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_college_filter_options() TO authenticated;

-- 5. CTA analytics computed server-side
CREATE OR REPLACE FUNCTION public.cta_analytics_summary(
  p_since timestamptz,
  p_outcome text DEFAULT NULL,
  p_section text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  WITH base AS (
    SELECT e.cta_key,
           e.outcome,
           e.created_at,
           e.page_path,
           e.user_id,
           s.label,
           COALESCE(s.category, 'Unknown') AS category,
           COALESCE(s.requires_login, false) AS requires_login,
           CASE
             WHEN e.page_path IS NULL THEN 'Unknown'
             WHEN split_part(split_part(e.page_path, '?', 1), '#', 1) IN ('/', '') THEN 'Home'
             ELSE initcap(replace(split_part(trim(both '/' from split_part(split_part(e.page_path, '?', 1), '#', 1)), '/', 1), '-', ' '))
           END AS section,
           NULLIF(split_part(trim(both '/' from split_part(split_part(e.page_path, '?', 1), '#', 1)), '/', 2), '') AS entity
      FROM public.cta_events e
      LEFT JOIN public.cta_settings s ON s.cta_key = e.cta_key
     WHERE e.created_at >= p_since
  ), filtered AS (
    SELECT * FROM base
     WHERE (p_outcome IS NULL OR p_outcome = 'all' OR outcome = p_outcome)
       AND (p_section IS NULL OR p_section = 'all' OR section = p_section)
       AND (p_category IS NULL OR p_category = 'all' OR category = p_category)
       AND (
         COALESCE(p_search, '') = ''
         OR cta_key ILIKE '%' || p_search || '%'
         OR COALESCE(label, '') ILIKE '%' || p_search || '%'
         OR COALESCE(page_path, '') ILIKE '%' || p_search || '%'
         OR category ILIKE '%' || p_search || '%'
       )
  )
  SELECT jsonb_build_object(
    'totals', (SELECT jsonb_build_object(
                 'total', count(*),
                 'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                 'prompted', count(*) FILTER (WHERE outcome = 'login_prompted'),
                 'unique', count(DISTINCT user_id)
               ) FROM filtered),
    'sections', (SELECT COALESCE(jsonb_agg(DISTINCT section ORDER BY section), '[]'::jsonb) FROM base),
    'by_cta', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'total')::int DESC), '[]'::jsonb)
                 FROM (SELECT jsonb_build_object('key', cta_key, 'label', COALESCE(label, cta_key), 'category', category,
                                                 'requires_login', requires_login,
                                                 'total', count(*),
                                                 'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                                                 'prompted', count(*) FILTER (WHERE outcome = 'login_prompted')) AS r
                         FROM filtered GROUP BY cta_key, label, category, requires_login) x),
    'by_section', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'total')::int DESC), '[]'::jsonb)
                     FROM (SELECT jsonb_build_object('key', section, 'total', count(*),
                                                     'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                                                     'prompted', count(*) FILTER (WHERE outcome = 'login_prompted')) AS r
                             FROM filtered GROUP BY section) x),
    'by_category', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'total')::int DESC), '[]'::jsonb)
                      FROM (SELECT jsonb_build_object('key', category, 'total', count(*),
                                                      'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                                                      'prompted', count(*) FILTER (WHERE outcome = 'login_prompted')) AS r
                              FROM filtered GROUP BY category) x),
    'by_page', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'total')::int DESC), '[]'::jsonb)
                  FROM (SELECT jsonb_build_object('key', COALESCE(page_path, '(unknown)'), 'total', count(*),
                                                  'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                                                  'prompted', count(*) FILTER (WHERE outcome = 'login_prompted')) AS r
                          FROM filtered GROUP BY page_path ORDER BY count(*) DESC LIMIT 100) x),
    'by_entity', (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'total')::int DESC), '[]'::jsonb)
                    FROM (SELECT jsonb_build_object('key', section || ' → ' || COALESCE(entity, '(list)'), 'total', count(*),
                                                    'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                                                    'prompted', count(*) FILTER (WHERE outcome = 'login_prompted')) AS r
                            FROM filtered WHERE section IN ('Colleges','Coaching','Exams')
                           GROUP BY section, entity ORDER BY count(*) DESC LIMIT 100) x),
    'trend', (SELECT COALESCE(jsonb_agg(r ORDER BY r->>'date'), '[]'::jsonb)
                FROM (SELECT jsonb_build_object('date', to_char(created_at, 'YYYY-MM-DD'), 'total', count(*),
                                                'executed', count(*) FILTER (WHERE outcome <> 'login_prompted'),
                                                'prompted', count(*) FILTER (WHERE outcome = 'login_prompted')) AS r
                        FROM filtered GROUP BY to_char(created_at, 'YYYY-MM-DD')) x),
    'recent', (SELECT COALESCE(jsonb_agg(r ORDER BY r->>'created_at' DESC), '[]'::jsonb)
                 FROM (SELECT jsonb_build_object('cta_key', cta_key, 'label', COALESCE(label, cta_key), 'category', category,
                                                 'outcome', outcome, 'created_at', created_at, 'page_path', page_path,
                                                 'section', section, 'user_id', user_id) AS r
                         FROM filtered ORDER BY created_at DESC LIMIT 300) x)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cta_analytics_summary(timestamptz,text,text,text,text) TO authenticated;