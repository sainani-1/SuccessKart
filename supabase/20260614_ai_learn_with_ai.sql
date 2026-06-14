-- Create rate limiting table for AI feature
create table if not exists public.ai_rate_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  request_count integer not null default 0,
  window_start timestamp with time zone not null default now(),
  daily_count integer not null default 0,
  daily_date text not null default ''
);

-- Add columns if table already exists (safe re-run)
alter table public.ai_rate_limits add column if not exists daily_count integer not null default 0;
alter table public.ai_rate_limits add column if not exists daily_date text not null default '';

-- Insert default AI settings
insert into public.settings (key, value)
values ('ai_grok_api_key', ''), ('ai_rate_limit_per_minute', '10'), ('ai_rate_limit_per_day', '100')
on conflict (key) do nothing;
