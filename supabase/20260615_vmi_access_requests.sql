-- VMI access requests — students request access to AI Prep / Talk Mock Interviews

create table if not exists public.vmi_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_feature text not null default 'both' check (requested_feature in ('ai_prep', 'talk_mock', 'both')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);

-- RLS
alter table public.vmi_access_requests enable row level security;

-- Admins can read/write all
drop policy if exists "Admins full access on vmi_access_requests" on public.vmi_access_requests;
create policy "Admins full access on vmi_access_requests" on public.vmi_access_requests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Students can insert their own and read their own
drop policy if exists "Students insert own vmi_access_requests" on public.vmi_access_requests;
create policy "Students insert own vmi_access_requests" on public.vmi_access_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "Students read own vmi_access_requests" on public.vmi_access_requests;
create policy "Students read own vmi_access_requests" on public.vmi_access_requests
  for select using (auth.uid() = user_id);
