-- SucessKart Meet: API keys table + default settings
create table if not exists public.sucesskart_meet_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key text not null unique,
  payment_id bigint references public.payments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sucesskart_meet_api_keys enable row level security;

alter table public.sucesskart_meet_api_keys add column if not exists minutes_remaining integer not null default 0;

drop policy if exists "Users can view own API keys" on public.sucesskart_meet_api_keys;

create policy "Users can view own API keys"
  on public.sucesskart_meet_api_keys for select
  using (auth.uid() = user_id);

insert into public.settings (key, value) values
  ('sucesskart_meet_price', '499'),
  ('sucesskart_meet_enabled', '1')
on conflict (key) do nothing;
