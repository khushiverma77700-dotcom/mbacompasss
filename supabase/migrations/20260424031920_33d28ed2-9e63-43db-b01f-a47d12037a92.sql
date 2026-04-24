create table if not exists public.page_summary_cache (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  page_id text not null,
  content_hash text not null,
  summary text not null,
  model text,
  created_at timestamptz not null default now(),
  unique (page_type, page_id, content_hash)
);
create index if not exists page_summary_cache_lookup on public.page_summary_cache(page_type, page_id, content_hash);
alter table public.page_summary_cache enable row level security;
drop policy if exists "page_summary_cache readable" on public.page_summary_cache;
create policy "page_summary_cache readable" on public.page_summary_cache for select using (true);