CREATE OR REPLACE FUNCTION public.assign_admin_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _found_user_id uuid;
BEGIN
  -- Only allow existing admins to call this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Look up the user by email in auth.users
  SELECT id INTO _found_user_id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;

  IF _found_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found with email: %', _email;
  END IF;

  -- Insert admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_found_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update admin_permissions with correct user_id
  UPDATE public.admin_permissions
  SET user_id = _found_user_id, updated_at = now()
  WHERE lower(email) = lower(_email);

  RETURN _found_user_id;
END;
$$;