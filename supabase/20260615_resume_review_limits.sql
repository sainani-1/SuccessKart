-- Per-user resume review limit override.
-- NULL = use default (RESUME_REVIEW_LIMIT in code = 1)
-- -1   = unlimited
-- >= 0 = custom limit

alter table public.profiles
add column if not exists resume_review_limit integer;
