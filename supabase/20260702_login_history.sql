-- Login history table - tracks every login, logout, and session takeover
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null default '',
  full_name text,
  action text not null default 'login',
  ip_address text,
  user_agent text,
  device_name text,
  city text,
  region text,
  country text,
  postal text,
  lat double precision,
  lon double precision,
  timezone text,
  isp text,
  org text,
  created_at timestamptz not null default now()
);

-- Add columns if table already existed without them (safe re-run)
alter table public.login_history add column if not exists email text not null default '';
alter table public.login_history add column if not exists full_name text;
alter table public.login_history add column if not exists action text not null default 'login';
alter table public.login_history add column if not exists event_type text not null default 'login';
alter table public.login_history add column if not exists ip_address text;
alter table public.login_history add column if not exists user_agent text;
alter table public.login_history add column if not exists device_name text;
alter table public.login_history add column if not exists city text;
alter table public.login_history add column if not exists region text;
alter table public.login_history add column if not exists country text;
alter table public.login_history add column if not exists postal text;
alter table public.login_history add column if not exists lat double precision;
alter table public.login_history add column if not exists lon double precision;
alter table public.login_history add column if not exists timezone text;
alter table public.login_history add column if not exists isp text;
alter table public.login_history add column if not exists org text;

-- Try to add foreign key constraint, skip if profiles.id type mismatch
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'login_history_user_id_fkey'
    and table_name = 'login_history'
  ) then
    execute 'alter table public.login_history add constraint login_history_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null';
  end if;
exception when others then
  raise notice 'Could not add foreign key constraint (may already exist or type mismatch): %', SQLERRM;
end $$;

-- Enable RLS
alter table public.login_history enable row level security;

-- Drop existing policies first (safe re-run)
do $$
begin
  if exists (select 1 from pg_policies where policyname = 'Admins can view login history' and tablename = 'login_history') then
    drop policy "Admins can view login history" on public.login_history;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Admins can delete login history' and tablename = 'login_history') then
    drop policy "Admins can delete login history" on public.login_history;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Users can insert their own login history' and tablename = 'login_history') then
    drop policy "Users can insert their own login history" on public.login_history;
  end if;
end $$;

create policy "Admins can view login history"
  on public.login_history for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete login history"
  on public.login_history for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Users can insert their own login history"
  on public.login_history for insert
  with check (auth.uid() = user_id);

create index if not exists idx_login_history_user_id on public.login_history(user_id);
create index if not exists idx_login_history_created_at on public.login_history(created_at desc);
create index if not exists idx_login_history_action on public.login_history(action);
