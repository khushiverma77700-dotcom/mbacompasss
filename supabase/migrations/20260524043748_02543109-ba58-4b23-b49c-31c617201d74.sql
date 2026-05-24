
ALTER TABLE public.vocab_words
  ADD COLUMN IF NOT EXISTS meaning_hindi text,
  ADD COLUMN IF NOT EXISTS pronunciation_syllables text,
  ADD COLUMN IF NOT EXISTS exam_appearances text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.vocab_progress
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_read ON public.vocab_progress(user_id, is_read);

-- RPC to mark/unmark a word as read for current user
CREATE OR REPLACE FUNCTION public.vocab_mark_read(_word_id uuid, _read boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.vocab_progress (user_id, word_id, is_read, read_at)
  VALUES (_uid, _word_id, _read, CASE WHEN _read THEN now() ELSE NULL END)
  ON CONFLICT (user_id, word_id) DO UPDATE
    SET is_read = EXCLUDED.is_read,
        read_at = EXCLUDED.read_at,
        updated_at = now();
END; $$;
