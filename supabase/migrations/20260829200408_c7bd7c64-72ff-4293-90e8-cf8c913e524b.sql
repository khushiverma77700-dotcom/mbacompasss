create table if not exists public.seo_intel_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_on date not null unique,
  clicks integer,
  impressions integer,
  ctr numeric,
  avg_position numeric,
  ranking_keywords integer,
  rank_1 integer,
  rank_2 integer,
  rank_3 integer,
  top_5 integer,
  top_10 integer,
  top_20 integer,
  gains integer,
  losses integer,
  indexed_pages integer,
  not_indexed_pages integer,
  pages_tracked integer,
  avg_health numeric,
  avg_psi_perf numeric,
  avg_lcp_ms numeric,
  open_recommendations integer,
  applied_changes integer,
  data_sources jsonb not null default '{}'::jsonb,
  coverage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select on public.seo_intel_daily_snapshots to authenticated;
grant all on public.seo_intel_daily_snapshots to service_role;

alter table public.seo_intel_daily_snapshots enable row level security;

create policy "Admins read seo daily snapshots"
on public.seo_intel_daily_snapshots
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create index if not exists seo_intel_daily_snapshots_date_idx
  on public.seo_intel_daily_snapshots (captured_on desc);