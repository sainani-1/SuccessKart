-- Ensure settings table exists (used across the app, no dedicated migration)
create table if not exists public.settings (
  key text primary key,
  value text not null default ''
);

-- AI misuse reports for non-educational content detection
create table if not exists public.ai_misuse_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null default 'unknown',
  profile_pic text,
  full_name text,
  message text not null,
  detected_at timestamptz not null default now()
);

alter table public.ai_misuse_reports enable row level security;

create policy "Admins can view misuse reports"
  on public.ai_misuse_reports for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete misuse reports"
  on public.ai_misuse_reports for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Insert default AI provider settings (safe re-run)
insert into public.settings (key, value)
values
  ('ai_openrouter_api_key', ''),
  ('ai_openrouter_enabled', 'false'),
  ('ai_gemini_api_key', ''),
  ('ai_gemini_enabled', 'false'),
  ('ai_cerebras_api_key', ''),
  ('ai_cerebras_enabled', 'false'),
  ('ai_grok_enabled', 'true')
on conflict (key) do nothing;
