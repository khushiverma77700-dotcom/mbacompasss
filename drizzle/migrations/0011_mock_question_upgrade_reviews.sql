CREATE TABLE public.mock_question_upgrade_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.mock_questions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source_snapshot jsonb NOT NULL,
  proposed_question jsonb NOT NULL,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_question_upgrade_reviews TO authenticated;
GRANT ALL ON public.mock_question_upgrade_reviews TO service_role;

ALTER TABLE public.mock_question_upgrade_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read mock question upgrade reviews"
ON public.mock_question_upgrade_reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create mock question upgrade reviews"
ON public.mock_question_upgrade_reviews FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update mock question upgrade reviews"
ON public.mock_question_upgrade_reviews FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete mock question upgrade reviews"
ON public.mock_question_upgrade_reviews FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX mock_question_upgrade_one_pending_idx
ON public.mock_question_upgrade_reviews(question_id)
WHERE status = 'pending';

CREATE INDEX mock_question_upgrade_reviews_status_created_idx
ON public.mock_question_upgrade_reviews(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.approve_mock_question_upgrade(_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _review public.mock_question_upgrade_reviews%ROWTYPE;
  _proposal jsonb;
  _question_type public.mock_question_type;
  _options jsonb;
  _option_count integer;
  _correct_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can approve question upgrades';
  END IF;

  SELECT * INTO _review
  FROM public.mock_question_upgrade_reviews
  WHERE id = _review_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Upgrade review not found'; END IF;
  IF _review.status <> 'pending' THEN RAISE EXCEPTION 'This upgrade has already been reviewed'; END IF;

  _proposal := _review.proposed_question;
  _question_type := COALESCE((_proposal->>'question_type')::public.mock_question_type, 'mcq'::public.mock_question_type);
  _options := COALESCE(_proposal->'options', '[]'::jsonb);

  IF length(btrim(COALESCE(_proposal->>'question_html', ''))) < 35 THEN RAISE EXCEPTION 'Proposed question is incomplete'; END IF;
  IF length(btrim(COALESCE(_proposal->>'explanation_html', ''))) < 80 THEN RAISE EXCEPTION 'Proposed explanation is incomplete'; END IF;
  IF btrim(COALESCE(_proposal->>'topic', '')) = '' THEN RAISE EXCEPTION 'Proposed topic is missing'; END IF;

  IF _question_type = 'mcq' THEN
    SELECT count(*), count(*) FILTER (WHERE COALESCE((value->>'is_correct')::boolean, false))
    INTO _option_count, _correct_count
    FROM jsonb_array_elements(_options);
    IF _option_count <> 4 OR _correct_count <> 1 THEN RAISE EXCEPTION 'Proposed MCQ must contain four options and exactly one correct answer'; END IF;
  ELSIF jsonb_array_length(COALESCE(_proposal->'tita_correct_answers', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Proposed TITA answer is missing';
  END IF;

  UPDATE public.mock_questions
  SET question_type = _question_type,
      question_html = _proposal->>'question_html',
      difficulty = 'hard'::public.mock_difficulty,
      topic = NULLIF(_proposal->>'topic', ''),
      tita_correct_answers = CASE WHEN _question_type = 'tita' THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(_proposal->'tita_correct_answers', '[]'::jsonb))) ELSE '{}'::text[] END,
      tita_numeric_tolerance = CASE WHEN _question_type = 'tita' AND (_proposal->>'tita_numeric_tolerance') IS NOT NULL THEN (_proposal->>'tita_numeric_tolerance')::numeric ELSE NULL END,
      explanation_html = _proposal->>'explanation_html',
      updated_at = now()
  WHERE id = _review.question_id;

  IF _question_type = 'mcq' THEN
    UPDATE public.mock_question_options AS existing
    SET option_label = proposed.option_label,
        option_html = proposed.option_html,
        is_correct = proposed.is_correct,
        sort_order = proposed.sort_order
    FROM (
      SELECT
        chr(65 + (ordinality - 1)::integer) AS option_label,
        COALESCE(value->>'option_html', value->>'text', '') AS option_html,
        COALESCE((value->>'is_correct')::boolean, false) AS is_correct,
        (ordinality - 1)::integer AS sort_order
      FROM jsonb_array_elements(_options) WITH ORDINALITY
    ) AS proposed
    WHERE existing.question_id = _review.question_id
      AND existing.sort_order = proposed.sort_order;

    INSERT INTO public.mock_question_options(question_id, option_label, option_html, is_correct, sort_order)
    SELECT _review.question_id, proposed.option_label, proposed.option_html, proposed.is_correct, proposed.sort_order
    FROM (
      SELECT chr(65 + (ordinality - 1)::integer) AS option_label,
             COALESCE(value->>'option_html', value->>'text', '') AS option_html,
             COALESCE((value->>'is_correct')::boolean, false) AS is_correct,
             (ordinality - 1)::integer AS sort_order
      FROM jsonb_array_elements(_options) WITH ORDINALITY
    ) AS proposed
    WHERE NOT EXISTS (
      SELECT 1 FROM public.mock_question_options existing
      WHERE existing.question_id = _review.question_id AND existing.sort_order = proposed.sort_order
    );
  END IF;

  UPDATE public.mock_question_upgrade_reviews
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_mock_question_upgrade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_mock_question_upgrade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_mock_question_upgrade(uuid) TO service_role;