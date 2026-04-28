
-- Section code → Personalized Hub section name (matches generate-mock-questions edge fn)
CREATE OR REPLACE FUNCTION public.backfill_personalized_questions_from_mocks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted integer := 0;
  _map jsonb := '{
    "CAT":  {"VARC":"VARC","DILR":"DILR","QA":"QA"},
    "NMAT": {"LS":"Language Skills","QS":"Quantitative Skills","LR":"Logical Reasoning"},
    "XAT":  {"VALR":"Verbal & Logical Ability","DM":"Decision Making","QADI":"Quantitative Ability","GK":"GK"},
    "SNAP": {"GE":"General English","QADS":"Quantitative & Data Interpretation","AR":"Analytical & Logical Reasoning"},
    "IIFT": {"VARC":"Verbal Ability & RC","QA":"Quantitative Analysis","DILR":"Data Interpretation & LR","GK":"GK"},
    "CMAT": {"QADI":"Quantitative Techniques","LR":"Logical Reasoning","LC":"Language Comprehension","GA":"GK","IE":"Innovation & Entrepreneurship"},
    "MAT":  {"LC":"Language Comprehension","MS":"Mathematical Skills","DA":"Data Analysis","ICR":"Intelligence & Critical Reasoning","IGE":"Indian & Global Environment"}
  }'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH src AS (
    SELECT
      t.exam_code,
      (_map -> t.exam_code ->> s.code) AS hub_section,
      CASE q.difficulty::text
        WHEN 'easy' THEN 'easy'
        WHEN 'hard' THEN 'difficult'
        ELSE 'moderate'
      END AS hub_difficulty,
      q.question_html AS question_text,
      q.explanation_html AS explanation,
      q.topic,
      (
        SELECT jsonb_agg(jsonb_build_object('label', o.option_label, 'text', o.option_html) ORDER BY o.sort_order)
        FROM mock_question_options o WHERE o.question_id = q.id
      ) AS options,
      (
        SELECT MIN(o.sort_order) FROM mock_question_options o
        WHERE o.question_id = q.id AND o.is_correct = true
      ) AS correct_index,
      q.id AS mock_q_id
    FROM mock_questions q
    JOIN mock_sections s ON s.id = q.section_id
    JOIN mock_tests t ON t.id = s.test_id
    WHERE q.question_type = 'mcq'
  ),
  ready AS (
    SELECT * FROM src
    WHERE hub_section IS NOT NULL
      AND options IS NOT NULL
      AND jsonb_array_length(options) = 4
      AND correct_index IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM personalized_questions pq
        WHERE pq.exam_code = src.exam_code
          AND pq.section = src.hub_section
          AND pq.question_text = src.question_text
      )
  )
  INSERT INTO personalized_questions
    (exam_code, section, difficulty, question_text, options, correct_index, explanation, topic, source, created_by)
  SELECT exam_code, hub_section, hub_difficulty, question_text, options, correct_index,
         explanation, topic, 'mock-mirror-backfill', auth.uid()
  FROM ready;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END;
$$;
