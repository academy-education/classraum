-- Weekly Quests — idempotent reward claims.
--
-- Quest PROGRESS is derived on the fly from existing weekly activity
-- (sessions, questions, active days) — nothing is written as the student
-- studies. This table only records that a completed quest's one-time
-- bonus XP has already been granted for a given ISO week, so the reward
-- fires exactly once per (student, quest, week).
--
-- Service-role only (matches the other study ledgers): RLS on, no client
-- policies — the API reads/writes via supabaseAdmin.

create table if not exists public.study_quest_claims (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references auth.users(id) on delete cascade,
  quest_key   text not null,
  week_start  date not null,
  reward_xp   integer not null default 0,
  claimed_at  timestamptz not null default now(),
  unique (student_id, quest_key, week_start)
);

create index if not exists study_quest_claims_student_week
  on public.study_quest_claims (student_id, week_start);

alter table public.study_quest_claims enable row level security;
