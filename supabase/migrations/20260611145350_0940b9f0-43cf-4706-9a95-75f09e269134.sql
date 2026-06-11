GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_personalized_hub_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_mock_access(uuid, uuid) TO anon, authenticated;