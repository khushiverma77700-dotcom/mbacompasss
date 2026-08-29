alter table public.seo_intel_pages
  add column if not exists psi_perf_score numeric,
  add column if not exists psi_seo_score numeric,
  add column if not exists psi_lcp_ms numeric,
  add column if not exists psi_cls numeric,
  add column if not exists psi_tbt_ms numeric,
  add column if not exists psi_fcp_ms numeric,
  add column if not exists psi_strategy text,
  add column if not exists psi_opportunities jsonb default '[]'::jsonb,
  add column if not exists psi_checked_at timestamptz,
  add column if not exists rendered_title text,
  add column if not exists rendered_h1 text,
  add column if not exists rendered_word_count integer,
  add column if not exists rendered_has_schema boolean,
  add column if not exists rendered_links_out integer,
  add column if not exists ssr_gap boolean,
  add column if not exists live_crawl_at timestamptz,
  add column if not exists live_crawl_error text;

create table if not exists public.seo_intel_speed_history (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  captured_on date not null default (now() at time zone 'utc')::date,
  strategy text not null default 'mobile',
  perf_score numeric,
  seo_score numeric,
  lcp_ms numeric,
  cls numeric,
  tbt_ms numeric,
  fcp_ms numeric,
  data_source text default 'pagespeed',
  created_at timestamptz not null default now(),
  unique (path, captured_on, strategy)
);

grant select on public.seo_intel_speed_history to authenticated;
grant all on public.seo_intel_speed_history to service_role;
alter table public.seo_intel_speed_history enable row level security;

create policy "Admins read speed history"
on public.seo_intel_speed_history for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_seo_intel_speed_hist_path on public.seo_intel_speed_history (path, captured_on desc);
create index if not exists idx_seo_intel_pages_psi on public.seo_intel_pages (psi_checked_at nulls first);
create index if not exists idx_seo_intel_pages_live on public.seo_intel_pages (live_crawl_at nulls first);