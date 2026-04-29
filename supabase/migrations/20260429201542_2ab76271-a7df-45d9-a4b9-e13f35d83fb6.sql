-- Hard-prevent duplicate mock questions at the database level.
-- Any second insert with the same content_hash will fail and be skipped by the generator.
CREATE UNIQUE INDEX IF NOT EXISTS mock_questions_content_hash_unique
  ON public.mock_questions (content_hash)
  WHERE content_hash IS NOT NULL;