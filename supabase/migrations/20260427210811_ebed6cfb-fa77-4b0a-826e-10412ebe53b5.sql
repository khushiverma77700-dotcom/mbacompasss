DROP FUNCTION IF EXISTS public.admin_search_students(text, integer);

CREATE OR REPLACE FUNCTION public.admin_search_students(_query text DEFAULT ''::text, _limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, display_name text, email text, phone text, enrolled_count bigint, banned_until timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.display_name,''), 'Unknown') AS display_name,
    u.email::text AS email,
    p.phone,
    (SELECT COUNT(*) FROM public.mock_enrollments me WHERE me.user_id = p.user_id) AS enrolled_count,
    u.banned_until
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND (
      _query = '' OR
      p.display_name ILIKE '%' || _query || '%' OR
      u.email ILIKE '%' || _query || '%' OR
      p.phone ILIKE '%' || _query || '%'
    )
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$function$;