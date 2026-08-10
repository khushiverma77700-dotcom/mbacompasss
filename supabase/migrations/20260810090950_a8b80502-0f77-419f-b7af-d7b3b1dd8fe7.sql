-- 1. Allow trusted server-side scoring (no end-user JWT) to write scores
CREATE OR REPLACE FUNCTION public.protect_mock_responses_scoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role / cron / SQL have no auth.uid(): trusted scoring path
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_correct    := NULL;
    NEW.marks_awarded := NULL;
  ELSE
    NEW.is_correct    := OLD.is_correct;
    NEW.marks_awarded := OLD.marks_awarded;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.protect_mock_attempts_scoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.total_score         := OLD.total_score;
  NEW.max_score           := OLD.max_score;
  NEW.sectional_scores    := OLD.sectional_scores;
  NEW.total_attempted     := OLD.total_attempted;
  NEW.total_correct       := OLD.total_correct;
  NEW.total_incorrect     := OLD.total_incorrect;
  NEW.accuracy            := OLD.accuracy;
  NEW.percentile          := OLD.percentile;
  NEW.all_india_rank      := OLD.all_india_rank;
  NEW.topic_breakdown     := OLD.topic_breakdown;
  RETURN NEW;
END; $function$;

-- 2. Rescore affected attempts (submitted but score never persisted)
WITH target AS (
  SELECT id, test_id FROM public.mock_attempts
  WHERE status IN ('submitted','auto_submitted') AND total_score IS NULL
),
ev AS (
  SELECT r.id AS response_id, t.id AS attempt_id, r.section_id, q.topic,
         (r.status IN ('answered','answered_marked')) AS answered,
         CASE
           WHEN r.status NOT IN ('answered','answered_marked') THEN NULL
           WHEN q.question_type = 'mcq' THEN (
             r.selected_option_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.mock_question_options o
               WHERE o.id = r.selected_option_id AND o.is_correct
             ))
           ELSE (
             lower(regexp_replace(coalesce(r.tita_answer,''),'\s','','g')) <> ''
             AND EXISTS (
               SELECT 1 FROM unnest(coalesce(q.tita_correct_answers, ARRAY[]::text[])) a
               WHERE lower(regexp_replace(a,'\s','','g'))
                     = lower(regexp_replace(coalesce(r.tita_answer,''),'\s','','g'))
             ))
         END AS is_correct,
         q.question_type, coalesce(q.positive_marks,3) AS pos, coalesce(q.negative_marks,1) AS neg
  FROM target t
  JOIN public.mock_responses r ON r.attempt_id = t.id
  JOIN public.mock_questions q ON q.id = r.question_id
),
marked AS (
  SELECT ev.*,
    CASE WHEN NOT answered THEN 0
         WHEN is_correct THEN pos
         WHEN question_type = 'tita' THEN 0
         ELSE -neg END AS marks
  FROM ev
),
upd AS (
  UPDATE public.mock_responses r
  SET is_correct = m.is_correct, marks_awarded = m.marks
  FROM marked m WHERE r.id = m.response_id
  RETURNING 1
),
sec AS (
  SELECT m.attempt_id, s.id AS section_id, s.code, s.name,
         sum(m.marks) AS score,
         count(*) FILTER (WHERE m.answered) AS attempted,
         count(*) FILTER (WHERE m.is_correct) AS correct,
         count(*) FILTER (WHERE m.answered AND NOT m.is_correct) AS incorrect
  FROM marked m JOIN public.mock_sections s ON s.id = m.section_id
  GROUP BY m.attempt_id, s.id, s.code, s.name
),
secmax AS (
  SELECT t.id AS attempt_id, s.id AS section_id, sum(coalesce(q.positive_marks,3)) AS maxm
  FROM target t
  JOIN public.mock_sections s ON s.test_id = t.test_id
  JOIN public.mock_questions q ON q.section_id = s.id
  GROUP BY t.id, s.id
),
secjson AS (
  SELECT coalesce(sec.attempt_id, secmax.attempt_id) AS attempt_id,
         jsonb_object_agg(coalesce(sec.section_id, secmax.section_id), jsonb_build_object(
           'code', sec.code, 'name', sec.name,
           'score', coalesce(sec.score,0), 'max', coalesce(secmax.maxm,0),
           'attempted', coalesce(sec.attempted,0),
           'correct', coalesce(sec.correct,0), 'incorrect', coalesce(sec.incorrect,0))) AS sectional
  FROM sec FULL JOIN secmax
    ON sec.attempt_id = secmax.attempt_id AND sec.section_id = secmax.section_id
  GROUP BY 1
),
tot AS (
  SELECT attempt_id,
         sum(marks) AS total_score,
         count(*) FILTER (WHERE answered) AS attempted,
         count(*) FILTER (WHERE is_correct) AS correct,
         count(*) FILTER (WHERE answered AND NOT is_correct) AS incorrect
  FROM marked GROUP BY attempt_id
),
maxtot AS (
  SELECT attempt_id, sum(maxm) AS max_score FROM secmax GROUP BY attempt_id
)
UPDATE public.mock_attempts a
SET total_score = coalesce(tot.total_score, 0),
    max_score = coalesce(maxtot.max_score, 0),
    total_attempted = coalesce(tot.attempted, 0),
    total_correct = coalesce(tot.correct, 0),
    total_incorrect = coalesce(tot.incorrect, 0),
    accuracy = CASE WHEN coalesce(tot.attempted,0) > 0
                    THEN round((tot.correct::numeric / tot.attempted) * 100, 2) ELSE 0 END,
    sectional_scores = coalesce(secjson.sectional, '{}'::jsonb)
FROM target
LEFT JOIN tot ON tot.attempt_id = target.id
LEFT JOIN maxtot ON maxtot.attempt_id = target.id
LEFT JOIN secjson ON secjson.attempt_id = target.id
WHERE a.id = target.id;