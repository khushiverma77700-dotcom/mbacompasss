REVOKE EXECUTE ON FUNCTION public.admin_search_students(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_students(text, int) TO authenticated;