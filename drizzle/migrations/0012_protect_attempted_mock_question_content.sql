CREATE OR REPLACE FUNCTION public.protect_attempted_mock_question_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.mock_responses WHERE question_id = OLD.id)
     OR EXISTS (
       SELECT 1
       FROM public.mock_attempts a
       JOIN public.mock_sections s ON s.test_id = a.test_id
       WHERE s.id = OLD.section_id AND a.status = 'in_progress'
     ) THEN
    IF NEW.question_type IS DISTINCT FROM OLD.question_type
       OR NEW.question_html IS DISTINCT FROM OLD.question_html
       OR NEW.difficulty IS DISTINCT FROM OLD.difficulty
       OR NEW.topic IS DISTINCT FROM OLD.topic
       OR NEW.tita_correct_answers IS DISTINCT FROM OLD.tita_correct_answers
       OR NEW.tita_numeric_tolerance IS DISTINCT FROM OLD.tita_numeric_tolerance
       OR NEW.explanation_html IS DISTINCT FROM OLD.explanation_html THEN
      RAISE EXCEPTION 'This question has student history or an active attempt and cannot be replaced safely';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_attempted_mock_question_content_trigger
BEFORE UPDATE ON public.mock_questions
FOR EACH ROW EXECUTE FUNCTION public.protect_attempted_mock_question_content();

CREATE OR REPLACE FUNCTION public.protect_attempted_mock_option_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _question_id uuid := COALESCE(OLD.question_id, NEW.question_id);
BEGIN
  IF EXISTS (SELECT 1 FROM public.mock_responses WHERE question_id = _question_id)
     OR EXISTS (
       SELECT 1
       FROM public.mock_attempts a
       JOIN public.mock_sections s ON s.test_id = a.test_id
       JOIN public.mock_questions q ON q.section_id = s.id
       WHERE q.id = _question_id AND a.status = 'in_progress'
     ) THEN
    RAISE EXCEPTION 'Options for a question with student history or an active attempt cannot be changed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER protect_attempted_mock_option_content_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.mock_question_options
FOR EACH ROW EXECUTE FUNCTION public.protect_attempted_mock_option_content();