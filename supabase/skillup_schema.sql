-- SkillUp: Coding curriculum progress and submissions

create table if not exists public.skillup_progress (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  problems_solved   int not null default 0,
  xp                int not null default 0,
  coins             int not null default 0,
  current_streak    int not null default 0,
  longest_streak    int not null default 0,
  total_submissions int not null default 0,
  total_coding_hours numeric not null default 0,
  solved_ids        int[] not null default '{}',
  last_active       date,
  updated_at        timestamptz not null default now()
);

create table if not exists public.skillup_submissions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  problem_id      int not null,
  status          text not null,
  language        text not null,
  xp_earned       int not null default 0,
  execution_time  numeric,
  memory_used     int,
  created_at      timestamptz not null default now()
);

create index if not exists idx_skillup_submissions_user_id on public.skillup_submissions(user_id);
create index if not exists idx_skillup_submissions_user_problem on public.skillup_submissions(user_id, problem_id);

-- RPC to atomically upsert skillup_progress (incrementing counters)

create or replace function public.upsert_skillup_progress(
  p_user_id         uuid,
  p_xp_earned       int,
  p_coins_earned    int,
  p_problem_id      int,
  p_passed          boolean,
  p_last_active     date,
  p_session_minutes numeric default 0
) returns void language plpgsql as $$
declare
  v_today date := coalesce(p_last_active, current_date);
  v_yesterday date := v_today - 1;
  v_new_streak int;
  v_already_solved boolean := exists (
    select 1
    from public.skillup_progress
    where user_id = p_user_id
      and solved_ids @> array[p_problem_id]
  );
begin
  v_new_streak := case
    when exists (select 1 from public.skillup_progress where user_id = p_user_id) then
      (select case
        when last_active = v_yesterday then current_streak + 1
        when last_active = v_today   then current_streak
        else 1
      end from public.skillup_progress where user_id = p_user_id)
    else 1
  end;

  insert into public.skillup_progress (user_id, problems_solved, xp, coins, current_streak, longest_streak, total_submissions, total_coding_hours, solved_ids, last_active, updated_at)
  values (
    p_user_id,
    case when p_passed then 1 else 0 end,
    p_xp_earned,
    p_coins_earned,
    v_new_streak,
    v_new_streak,
    1,
    p_session_minutes / 60.0,
    case when p_passed then array[p_problem_id] else '{}'::int[] end,
    v_today,
    now()
  )
  on conflict (user_id) do update set
    problems_solved = case when p_passed and not v_already_solved then public.skillup_progress.problems_solved + 1 else public.skillup_progress.problems_solved end,
    xp             = public.skillup_progress.xp + case when p_passed and not v_already_solved then p_xp_earned else 0 end,
    coins          = public.skillup_progress.coins + case when p_passed and not v_already_solved then p_coins_earned else 0 end,
    total_submissions = public.skillup_progress.total_submissions + 1,
    total_coding_hours = public.skillup_progress.total_coding_hours + p_session_minutes / 60.0,
    solved_ids     = case when p_passed and not v_already_solved
                          then public.skillup_progress.solved_ids || p_problem_id
                          else public.skillup_progress.solved_ids end,
    last_active    = v_today,
    updated_at     = now(),
    current_streak = v_new_streak,
    longest_streak = greatest(public.skillup_progress.longest_streak, v_new_streak);
end;
$$;

alter table public.skillup_progress enable row level security;
alter table public.skillup_submissions enable row level security;

drop policy if exists "Users can read own progress" on public.skillup_progress;
create policy "Users can read own progress"
  on public.skillup_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.skillup_progress;
create policy "Users can insert own progress"
  on public.skillup_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.skillup_progress;
create policy "Users can update own progress"
  on public.skillup_progress for update
  using (auth.uid() = user_id);

drop policy if exists "Users can read own submissions" on public.skillup_submissions;
create policy "Users can read own submissions"
  on public.skillup_submissions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own submissions" on public.skillup_submissions;
create policy "Users can insert own submissions"
  on public.skillup_submissions for insert
  with check (auth.uid() = user_id);
