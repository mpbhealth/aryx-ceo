-- Owner desk facts. Aggregates only. marketing_spend is the one operator write.

set lock_timeout = '5s';

alter table public.fact_traffic_daily
  add column if not exists leads numeric(14, 2) not null default 0,
  add column if not exists new_members numeric(14, 2) not null default 0;

create table if not exists public.fact_book_quality (
  org_id uuid not null references public.orgs (id) on delete cascade,
  grain text not null check (grain in ('product', 'advisor')),
  quality_key text not null,
  cohort_size integer not null default 0,
  cohort_30 integer not null default 0,
  cohort_60 integer not null default 0,
  cohort_90 integer not null default 0,
  survived_30 integer not null default 0,
  survived_60 integer not null default 0,
  survived_90 integer not null default 0,
  first_pay_success_pct numeric(6, 2),
  contribution numeric(14, 2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, grain, quality_key)
);

create table if not exists public.fact_enrollment_ops (
  org_id uuid not null references public.orgs (id) on delete cascade,
  fact_date date not null,
  active_count integer not null default 0,
  future_active_count integer not null default 0,
  other_count integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, fact_date)
);

create table if not exists public.fact_agent_upline (
  org_id uuid not null references public.orgs (id) on delete cascade,
  upline_key text not null,
  display_name text,
  downline_count integer not null default 0,
  mrr numeric(14, 2) not null default 0,
  net_mrr numeric(14, 2) not null default 0,
  active_members integer not null default 0,
  mrr_share_pct numeric(6, 2),
  early_cancel_pct numeric(6, 2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, upline_key)
);

create table if not exists public.marketing_spend (
  org_id uuid not null references public.orgs (id) on delete cascade,
  period_start date not null,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, period_start)
);

create index if not exists fact_book_quality_org_idx on public.fact_book_quality (org_id, grain);
create index if not exists fact_enrollment_ops_org_idx on public.fact_enrollment_ops (org_id, fact_date desc);
create index if not exists fact_agent_upline_org_idx on public.fact_agent_upline (org_id, mrr desc);

alter table public.fact_book_quality enable row level security;
alter table public.fact_enrollment_ops enable row level security;
alter table public.fact_agent_upline enable row level security;
alter table public.marketing_spend enable row level security;

drop policy if exists fact_book_quality_select on public.fact_book_quality;
create policy fact_book_quality_select on public.fact_book_quality
  for select to authenticated
  using (org_id in (select public.member_org_ids()));

drop policy if exists fact_enrollment_ops_select on public.fact_enrollment_ops;
create policy fact_enrollment_ops_select on public.fact_enrollment_ops
  for select to authenticated
  using (org_id in (select public.member_org_ids()));

drop policy if exists fact_agent_upline_select on public.fact_agent_upline;
create policy fact_agent_upline_select on public.fact_agent_upline
  for select to authenticated
  using (org_id in (select public.member_org_ids()));

drop policy if exists marketing_spend_select on public.marketing_spend;
create policy marketing_spend_select on public.marketing_spend
  for select to authenticated
  using (org_id in (select public.member_org_ids()));

drop policy if exists marketing_spend_mutate on public.marketing_spend;
create policy marketing_spend_mutate on public.marketing_spend
  for all to authenticated
  using (public.is_org_operator(org_id))
  with check (public.is_org_operator(org_id));

revoke all on
  public.fact_book_quality,
  public.fact_enrollment_ops,
  public.fact_agent_upline,
  public.marketing_spend
  from anon, public;

revoke insert, update, delete on
  public.fact_book_quality,
  public.fact_enrollment_ops,
  public.fact_agent_upline
  from authenticated;

grant select on
  public.fact_book_quality,
  public.fact_enrollment_ops,
  public.fact_agent_upline,
  public.marketing_spend
  to authenticated;

grant insert, update, delete on public.marketing_spend to authenticated;
