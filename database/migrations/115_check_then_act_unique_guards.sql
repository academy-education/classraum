-- 115: database-level guards for check-then-act writes found in the
-- APPLIED to production 2026-10-02 via Supabase MCP (renumbered from 114,
-- which another branch used). Duplicates re-checked (all 0) and the file
-- built in a rolled-back txn immediately before; a legacy insert without
-- grader_route succeeded there, so the deployed code keeps working.
-- The code on this branch NEEDS the grader_route column (grade-audio
-- inserts it; gradeResponse filters on it) — it exists now.
-- 2026-10-02 race audit. Each index backs code that used to SELECT
-- "already exists?" and then INSERT with nothing in between — two callers a
-- second apart both miss the SELECT and both insert (CLAUDE.md: the TOEFL
-- Writing run that produced four submission rows for two essays).
--
-- Live duplicate check before writing this (all 0, so every index builds):
--   study_response_submissions text key ........ 0 groups
--   study_response_submissions audio key ....... 0 groups (0 audio rows)
--   study_response_grades per submission ........ 0 groups
--   study_sessions daily challenge per day ...... 0 groups
--   webhook_events.webhook_id ................... 0 groups (0 rows carry one)
--
-- 1. Which route graded a submission. The text grader (gradeAndPersistResponse)
--    and the audio grader (/api/study/speaking/grade-audio) legitimately both
--    write a row for one recorded answer when the audio call 5xx's and the
--    client falls back to text, so their uniqueness keys must not collide.
alter table public.study_response_submissions
  add column if not exists grader_route text not null default 'text'
  check (grader_route in ('text', 'audio'));

update public.study_response_submissions s
   set grader_route = 'audio'
 where exists (select 1 from public.study_response_grades g
                where g.submission_id = s.id and g.grader_model ilike '%audio%');

-- Text grades: the cache key gradeAndPersistResponse already reads by.
-- md5() keeps long prompts/essays inside the btree row limit.
create unique index if not exists study_response_submissions_text_once
  on public.study_response_submissions
  (session_id, student_id, md5(prompt_text), md5(response_text))
  where grader_route = 'text';

-- Audio grades: the key grade-audio's dedupe reads by (same recording).
create unique index if not exists study_response_submissions_audio_once
  on public.study_response_submissions
  (session_id, student_id, md5(prompt_text), coalesce(audio_path, ''))
  where grader_route = 'audio';

-- One grade per submission: the loser of a race attaches nothing and
-- reads the winner's grade, so both callers report the same band.
create unique index if not exists study_response_grades_one_per_submission
  on public.study_response_grades (submission_id);

-- 2. One daily-challenge session per student per day
--    (/api/study/daily-challenge/start: "reuse today's" was a read).
create unique index if not exists study_sessions_daily_challenge_once
  on public.study_sessions (student_id, (config ->> 'dailyChallenge'))
  where config ? 'dailyChallenge';

-- 3. Re-assert migration 023. /api/payments/webhook's comment says the
--    "already processed?" SELECT is backed by a unique index on
--    webhook_events.webhook_id, and claimWebhookId gates the parent's
--    "payment received" notification on a 23505 from it. On 2026-10-02 that
--    index did NOT exist in the live database (pg_indexes shows only the
--    pkey), so two concurrent deliveries could both notify.
create unique index if not exists webhook_events_webhook_id_unique
  on public.webhook_events (webhook_id)
  where webhook_id is not null;

-- Rollback:
--   (webhook_events_webhook_id_unique belongs to 023; leave it)
--   drop index if exists public.study_sessions_daily_challenge_once;
--   drop index if exists public.study_response_grades_one_per_submission;
--   drop index if exists public.study_response_submissions_audio_once;
--   drop index if exists public.study_response_submissions_text_once;
--   alter table public.study_response_submissions drop column if exists grader_route;
