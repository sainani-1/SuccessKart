-- Voice Mock Interview (VMI) access control.
-- Admin grants individual students access to AI Prep and/or Talk Mock Interviews.
-- Access limit: 'monthly_once' or 'unlimited'

create table if not exists public.vmi_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ai_prep_enabled boolean not null default false,
  talk_mock_enabled boolean not null default false,
  access_limit text not null default 'unlimited' check (access_limit in ('monthly_once', 'unlimited')),
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_vmi_access_user on public.vmi_access(user_id);

-- RLS
alter table public.vmi_access enable row level security;

-- Admins can read/write all rows
drop policy if exists "Admins can read vmi_access" on public.vmi_access;
create policy "Admins can read vmi_access" on public.vmi_access
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can insert vmi_access" on public.vmi_access;
create policy "Admins can insert vmi_access" on public.vmi_access
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can update vmi_access" on public.vmi_access;
create policy "Admins can update vmi_access" on public.vmi_access
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can delete vmi_access" on public.vmi_access;
create policy "Admins can delete vmi_access" on public.vmi_access
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Students can read their own row
drop policy if exists "Students can read own vmi_access" on public.vmi_access;
create policy "Students can read own vmi_access" on public.vmi_access
  for select using (
    auth.uid() = user_id
  );
