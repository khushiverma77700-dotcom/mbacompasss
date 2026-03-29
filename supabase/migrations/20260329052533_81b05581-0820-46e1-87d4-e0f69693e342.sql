
-- 1. Fix profiles: restrict SELECT to owner only
DROP POLICY "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO public
USING (auth.uid() = user_id);

-- 2. Harden has_role: ensure caller can only check their own role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  )
$$;

-- 3. Fix inquiry email validation with regex
DROP POLICY "Public inquiry submission" ON public.inquiries;

CREATE POLICY "Public inquiry submission"
ON public.inquiries FOR INSERT
TO public
WITH CHECK (
  name IS NOT NULL AND length(name) <= 255
  AND email IS NOT NULL AND length(email) <= 255
  AND email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
);

-- 4. Fix newsletter email validation with regex
DROP POLICY "Public newsletter subscription" ON public.newsletter_subscribers;

CREATE POLICY "Public newsletter subscription"
ON public.newsletter_subscribers FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL AND length(email) <= 255
  AND email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
);
