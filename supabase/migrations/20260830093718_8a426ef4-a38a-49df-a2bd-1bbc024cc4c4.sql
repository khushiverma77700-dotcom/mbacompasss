create table if not exists public.seo_gsc_daily (
  captured_on date primary key,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric,
  avg_position numeric,
  synced_at timestamptz not null default now()
);

grant select on public.seo_gsc_daily to authenticated;
grant all on public.seo_gsc_daily to service_role;

alter table public.seo_gsc_daily enable row level security;

drop policy if exists "Admins read gsc daily" on public.seo_gsc_daily;
create policy "Admins read gsc daily"
on public.seo_gsc_daily
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create index if not exists seo_gsc_daily_date_idx on public.seo_gsc_daily (captured_on desc);