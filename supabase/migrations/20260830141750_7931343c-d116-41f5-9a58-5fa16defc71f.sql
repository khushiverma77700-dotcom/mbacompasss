do $$
declare t text;
begin
  foreach t in array array[
    'seo_intel_jobs', 'seo_intel_activity', 'seo_intel_recommendations',
    'seo_intel_experiments', 'seo_intel_keywords', 'seo_intel_pages'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;