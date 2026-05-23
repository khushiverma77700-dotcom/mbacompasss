
CREATE OR REPLACE FUNCTION public.mirror_mock_question_to_personalized(_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _map jsonb := '{
    "CAT":  {"VARC":"VARC","DILR":"DILR","QA":"QA"},
    "NMAT": {"LS":"Language Skills","QS":"Quantitative Skills","LR":"Logical Reasoning"},
    "XAT":  {"VALR":"Verbal & Logical Ability","DM":"Decision Making","QADI":"Quantitative Ability","GK":"GK"},
    "SNAP": {"GE":"General English","QADS":"Quantitative & Data Interpretation","AR":"Analytical & Logical Reasoning"},
    "IIFT": {"VARC":"Verbal Ability & RC","QA":"Quantitative Analysis","DILR":"Data Interpretation & LR","GK":"GK"},
    "CMAT": {"QADI":"Quantitative Techniques","LR":"Logical Reasoning","LC":"Language Comprehension","GA":"GK","IE":"Innovation & Entrepreneurship"},
    "MAT":  {"LC":"Language Comprehension","MS":"Mathematical Skills","DA":"Data Analysis","ICR":"Intelligence & Critical Reasoning","IGE":"Indian & Global Environment"}
  }'::jsonb;
  _row record;
  _options jsonb;
  _correct_index int;
  _hub_section text;
  _hub_difficulty text;
BEGIN
  SELECT q.id, q.question_html, q.explanation_html, q.topic, q.difficulty,
         q.question_type, t.exam_code::text AS exam_code, t.test_type::text AS test_type,
         t.id AS test_id, s.code::text AS section_code
  INTO _row
  FROM mock_questions q
  JOIN mock_sections s ON s.id = q.section_id
  JOIN mock_tests t ON t.id = s.test_id
  WHERE q.id = _question_id;

  IF NOT FOUND OR _row.question_type::text <> 'mcq' THEN
    RETURN;
  END IF;

  IF _row.test_type NOT IN ('sectional','topic_wise')
     AND NOT EXISTS (SELECT 1 FROM daily_test_assignments WHERE test_id = _row.test_id)
  THEN
    RETURN;
  END IF;

  _hub_section := _map -> _row.exam_code ->> _row.section_code;
  IF _hub_section IS NULL THEN RETURN; END IF;

  _hub_difficulty := CASE _row.difficulty::text
    WHEN 'easy' THEN 'easy'
    WHEN 'hard' THEN 'difficult'
    ELSE 'moderate'
  END;

  SELECT jsonb_agg(jsonb_build_object('label', o.option_label, 'text', o.option_html) ORDER BY o.sort_order)
  INTO _options
  FROM mock_question_options o WHERE o.question_id = _row.id;

  SELECT MIN(o.sort_order) INTO _correct_index
  FROM mock_question_options o WHERE o.question_id = _row.id AND o.is_correct = true;

  IF _options IS NULL OR jsonb_array_length(_options) <> 4 OR _correct_index IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO personalized_questions
    (exam_code, section, difficulty, question_text, options, correct_index, explanation, topic, source)
  SELECT _row.exam_code, _hub_section, _hub_difficulty, _row.question_html,
         _options, _correct_index, _row.explanation_html, _row.topic, 'auto-mirror'
  WHERE NOT EXISTS (
    SELECT 1 FROM personalized_questions pq
    WHERE pq.exam_code = _row.exam_code
      AND pq.section = _hub_section
      AND pq.question_text = _row.question_html
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_mirror_mock_question()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.mirror_mock_question_to_personalized(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mirror_mock_question_after_insert ON public.mock_questions;
CREATE TRIGGER mirror_mock_question_after_insert
AFTER INSERT OR UPDATE OF question_html, explanation_html, topic, difficulty
ON public.mock_questions
FOR EACH ROW
EXECUTE FUNCTION public.trg_mirror_mock_question();

CREATE OR REPLACE FUNCTION public.trg_mirror_mock_question_from_option()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.mirror_mock_question_to_personalized(COALESCE(NEW.question_id, OLD.question_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS mirror_mock_question_from_option ON public.mock_question_options;
CREATE TRIGGER mirror_mock_question_from_option
AFTER INSERT OR UPDATE OF option_html, is_correct, sort_order
ON public.mock_question_options
FOR EACH ROW
EXECUTE FUNCTION public.trg_mirror_mock_question_from_option();

-- Backfill
INSERT INTO personalized_questions
  (exam_code, section, difficulty, question_text, options, correct_index, explanation, topic, source)
WITH src AS (
  SELECT
    t.exam_code::text AS exam_code,
    (
      '{
        "CAT":  {"VARC":"VARC","DILR":"DILR","QA":"QA"},
        "NMAT": {"LS":"Language Skills","QS":"Quantitative Skills","LR":"Logical Reasoning"},
        "XAT":  {"VALR":"Verbal & Logical Ability","DM":"Decision Making","QADI":"Quantitative Ability","GK":"GK"},
        "SNAP": {"GE":"General English","QADS":"Quantitative & Data Interpretation","AR":"Analytical & Logical Reasoning"},
        "IIFT": {"VARC":"Verbal Ability & RC","QA":"Quantitative Analysis","DILR":"Data Interpretation & LR","GK":"GK"},
        "CMAT": {"QADI":"Quantitative Techniques","LR":"Logical Reasoning","LC":"Language Comprehension","GA":"GK","IE":"Innovation & Entrepreneurship"},
        "MAT":  {"LC":"Language Comprehension","MS":"Mathematical Skills","DA":"Data Analysis","ICR":"Intelligence & Critical Reasoning","IGE":"Indian & Global Environment"}
      }'::jsonb -> t.exam_code::text ->> s.code::text
    ) AS hub_section,
    CASE q.difficulty::text WHEN 'easy' THEN 'easy' WHEN 'hard' THEN 'difficult' ELSE 'moderate' END AS hub_difficulty,
    q.question_html AS question_text,
    q.explanation_html AS explanation,
    q.topic,
    (SELECT jsonb_agg(jsonb_build_object('label', o.option_label, 'text', o.option_html) ORDER BY o.sort_order)
       FROM mock_question_options o WHERE o.question_id = q.id) AS options,
    (SELECT MIN(o.sort_order) FROM mock_question_options o WHERE o.question_id = q.id AND o.is_correct = true) AS correct_index
  FROM mock_questions q
  JOIN mock_sections s ON s.id = q.section_id
  JOIN mock_tests t ON t.id = s.test_id
  WHERE q.question_type::text = 'mcq'
    AND (
      t.test_type::text IN ('sectional','topic_wise')
      OR EXISTS (SELECT 1 FROM daily_test_assignments d WHERE d.test_id = t.id)
    )
)
SELECT exam_code, hub_section, hub_difficulty, question_text, options, correct_index, explanation, topic, 'auto-mirror-backfill'
FROM src
WHERE hub_section IS NOT NULL
  AND options IS NOT NULL
  AND jsonb_array_length(options) = 4
  AND correct_index IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM personalized_questions pq
    WHERE pq.exam_code = src.exam_code
      AND pq.section = src.hub_section
      AND pq.question_text = src.question_text
  );
