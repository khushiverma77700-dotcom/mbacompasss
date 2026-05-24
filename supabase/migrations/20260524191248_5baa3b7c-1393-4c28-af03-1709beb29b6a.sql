
ALTER TABLE public.personalized_questions
  ADD COLUMN IF NOT EXISTS question_hash text
  GENERATED ALWAYS AS (md5(lower(btrim(question_text)))) STORED;

-- Remove existing duplicates, keeping the oldest row per (exam, section, hash)
DELETE FROM public.personalized_questions a
USING public.personalized_questions b
WHERE a.id <> b.id
  AND a.exam_code = b.exam_code
  AND a.section = b.section
  AND a.question_hash = b.question_hash
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS personalized_questions_unique_hash
  ON public.personalized_questions (exam_code, section, question_hash);
