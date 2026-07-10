-- Allow admin users to read all SkillUp progress (for Track SY admin page)

drop policy if exists "Admins can read all skillup progress" on public.skillup_progress;
create policy "Admins can read all skillup progress"
  on public.skillup_progress for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
