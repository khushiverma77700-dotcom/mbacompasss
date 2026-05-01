ALTER TABLE public.support_faqs
  ADD COLUMN IF NOT EXISTS question_norm text
  GENERATED ALWAYS AS (
    regexp_replace(lower(btrim(coalesce(question, ''))), '[^a-z0-9]+', '', 'g')
  ) STORED;

DROP INDEX IF EXISTS public.support_faqs_unique_question_category;

CREATE UNIQUE INDEX IF NOT EXISTS support_faqs_unique_question_with_category
ON public.support_faqs (category, question_norm)
WHERE question_norm <> '' AND category IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS support_faqs_unique_question_no_category
ON public.support_faqs (question_norm)
WHERE question_norm <> '' AND category IS NULL;