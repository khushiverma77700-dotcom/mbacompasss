
-- 1. cat_score_submissions: require auth + user_id = auth.uid() on insert
DROP POLICY IF EXISTS "Anyone can submit CAT score" ON public.cat_score_submissions;

CREATE POLICY "Authenticated users can submit own CAT score"
ON public.cat_score_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND candidate_name IS NOT NULL
  AND length(candidate_name) BETWEEN 1 AND 255
  AND total_score IS NOT NULL
);

-- 2. realtime.messages: scope subscriptions to the user's own topic
DROP POLICY IF EXISTS "authenticated_can_receive_realtime" ON realtime.messages;

CREATE POLICY "authenticated_can_receive_own_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user:' || (SELECT auth.uid())::text
);
