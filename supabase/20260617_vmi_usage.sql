create table public.vmi_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('ai_prep', 'talk_mock')),
  used_count integer not null default 0,
  month text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, feature, month)
);

alter table public.vmi_usage enable row level security;

create policy "Admins can read all vmi_usage"
  on public.vmi_usage for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can insert vmi_usage"
  on public.vmi_usage for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can update vmi_usage"
  on public.vmi_usage for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete vmi_usage"
  on public.vmi_usage for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
