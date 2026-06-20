create table if not exists public.sucesskart_meet_scheduled (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_id uuid not null references public.sucesskart_meet_api_keys(id) on delete cascade,
  room_name text not null,
  title text not null default '',
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','active','ended','cancelled')),
  room_sid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sucesskart_meet_scheduled enable row level security;

create policy "Users can view own scheduled meetings"
  on public.sucesskart_meet_scheduled for select
  using (auth.uid() = user_id);

create policy "Users can insert own scheduled meetings"
  on public.sucesskart_meet_scheduled for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scheduled meetings"
  on public.sucesskart_meet_scheduled for update
  using (auth.uid() = user_id);
