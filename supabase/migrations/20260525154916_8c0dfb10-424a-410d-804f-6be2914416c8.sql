
CREATE OR REPLACE FUNCTION public.has_active_personalized_hub_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.personalized_hub_access
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

DROP POLICY IF EXISTS "Anyone signed in can read questions" ON public.personalized_questions;

CREATE POLICY "Hub-access users can read questions"
ON public.personalized_questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.has_active_personalized_hub_access(auth.uid())
);
