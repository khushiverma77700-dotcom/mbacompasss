
CREATE INDEX IF NOT EXISTS idx_indexing_logs_url_id ON public.indexing_logs(indexing_url_id);
CREATE INDEX IF NOT EXISTS idx_indexing_logs_status_created ON public.indexing_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indexing_logs_created_at ON public.indexing_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mega_menu_active_type ON public.mega_menu_items(menu_type, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
ANALYZE public.indexing_logs;
ANALYZE public.mega_menu_items;
ANALYZE public.user_roles;
