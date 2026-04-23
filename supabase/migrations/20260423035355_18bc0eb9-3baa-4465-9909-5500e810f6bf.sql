-- Public-safe check whether an email belongs to a pre-seeded admin
CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE lower(email) = lower(_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;