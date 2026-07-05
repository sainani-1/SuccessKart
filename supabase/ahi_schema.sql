-- AHI (AI Human Interview) tables
create table if not exists public.ahi_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  rounds integer not null default 0,
  total_questions integer not null default 0,
  answers jsonb default '[]'::jsonb,
  summary text,
  overall_score integer,
  status text not null default 'in_progress'
);

alter table public.ahi_interviews enable row level security;

-- Users can view their own interviews
create policy "Users can view own interviews"
  on public.ahi_interviews for select
  using (auth.uid() = user_id);

-- Admins can view all interviews
create policy "Admins can view all interviews"
  on public.ahi_interviews for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Users can insert their own interviews
create policy "Users can insert own interviews"
  on public.ahi_interviews for insert
  with check (auth.uid() = user_id);

-- Users can update their own interviews
create policy "Users can update own interviews"
  on public.ahi_interviews for update
  using (auth.uid() = user_id);

-- Admins can delete interviews
create policy "Admins can delete interviews"
  on public.ahi_interviews for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create index if not exists idx_ahi_interviews_user_id on public.ahi_interviews(user_id);
create index if not exists idx_ahi_interviews_created_at on public.ahi_interviews(started_at desc);

-- AHI settings key: ahi_groq_api_key
-- AHI authorized users key: ahi_authorized_users (JSON array of user IDs)
