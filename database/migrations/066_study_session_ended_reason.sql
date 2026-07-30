-- 066: why a test session ended, when it wasn't a deliberate submit.
--
-- Written by /api/study/test/submit when the client reports that the
-- native app was backgrounded during a timed test: the exit guard
-- auto-submits whatever was answered and the session is marked here so
-- the reason outlives the screen that reported it.
--
-- Nullable and additive on purpose. The submit route writes it in its
-- own statement AFTER the score is persisted and swallows failure, so
-- an un-migrated environment still grades and returns tests normally.

alter table public.study_sessions
  add column if not exists ended_reason text;

comment on column public.study_sessions.ended_reason is
  'Why the session ended when it was not a deliberate submit. '
  'Currently only ''app_exited'' — the native app was backgrounded '
  'mid-test. NULL for a normally submitted or still-running session.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'study_sessions_ended_reason_check'
  ) then
    alter table public.study_sessions
      add constraint study_sessions_ended_reason_check
      check (ended_reason is null or ended_reason in ('app_exited'));
  end if;
end $$;
