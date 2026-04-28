-- One-time backfill: strip embedded "Q1.", "Question 1:", "Set 1:", "(A)", "A.", "1)" prefixes
-- from question and option HTML so the UI's static labels are not duplicated.

-- 1) mock_questions.question_html: strip leading Q-prefixes (run a few times to chain-strip)
UPDATE public.mock_questions
SET question_html = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(question_html, '^(\s*(?:<[^>]+>\s*)*)\s*Q\.?\s*\d+\s*[.\):\-]?\s*', '\1', 'i'),
        '^(\s*(?:<[^>]+>\s*)*)\s*Question\s*\d*\s*[.\):\-]?\s*', '\1', 'i'),
      '^(\s*(?:<[^>]+>\s*)*)\s*Set\s*\d+\s*[.\):\-]?\s*', '\1', 'i'),
    '^(\s*(?:<[^>]+>\s*)*)\s*\(?\d+\)?\s*[.\):\-]\s*', '\1', ''),
  '^(\s*(?:<[^>]+>\s*)*)\s*Q\.?\s*\d+\s*[.\):\-]?\s*', '\1', 'i')
WHERE question_html ~* '^(\s*(?:<[^>]+>\s*)*)\s*(Q\.?\s*\d+|Question\s*\d*|Set\s*\d+|\(?\d+\)?)\s*[.\):\-]';

-- 2) mock_question_options.option_html: strip leading A/B/C/D/1-4 labels
UPDATE public.mock_question_options
SET option_html = regexp_replace(option_html,
  '^(\s*(?:<[^>]+>\s*)*)\s*\(?\s*[A-Da-d1-4]\s*\)?\s*[.\):\-]\s*', '\1', '')
WHERE option_html ~ '^(\s*(?:<[^>]+>\s*)*)\s*\(?\s*[A-Da-d1-4]\s*\)?\s*[.\):\-]';

-- 3) personalized_questions.question_text: same as mock_questions
UPDATE public.personalized_questions
SET question_text = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(question_text, '^(\s*(?:<[^>]+>\s*)*)\s*Q\.?\s*\d+\s*[.\):\-]?\s*', '\1', 'i'),
        '^(\s*(?:<[^>]+>\s*)*)\s*Question\s*\d*\s*[.\):\-]?\s*', '\1', 'i'),
      '^(\s*(?:<[^>]+>\s*)*)\s*Set\s*\d+\s*[.\):\-]?\s*', '\1', 'i'),
    '^(\s*(?:<[^>]+>\s*)*)\s*\(?\d+\)?\s*[.\):\-]\s*', '\1', ''),
  '^(\s*(?:<[^>]+>\s*)*)\s*Q\.?\s*\d+\s*[.\):\-]?\s*', '\1', 'i')
WHERE question_text ~* '^(\s*(?:<[^>]+>\s*)*)\s*(Q\.?\s*\d+|Question\s*\d*|Set\s*\d+|\(?\d+\)?)\s*[.\):\-]';

-- 4) personalized_questions.options (jsonb array): strip option-letter prefix from each element's "text"
UPDATE public.personalized_questions
SET options = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'object' AND (elem->>'text') IS NOT NULL THEN
        jsonb_set(elem, '{text}',
          to_jsonb(regexp_replace(elem->>'text',
            '^(\s*(?:<[^>]+>\s*)*)\s*\(?\s*[A-Da-d1-4]\s*\)?\s*[.\):\-]\s*', '\1', '')))
      ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(options) WITH ORDINALITY AS arr(elem, ord)
)
WHERE options IS NOT NULL
  AND jsonb_typeof(options) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(options) e
    WHERE jsonb_typeof(e) = 'object'
      AND (e->>'text') ~ '^(\s*(?:<[^>]+>\s*)*)\s*\(?\s*[A-Da-d1-4]\s*\)?\s*[.\):\-]'
  );