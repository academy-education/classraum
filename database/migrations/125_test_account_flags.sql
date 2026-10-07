-- 125_test_account_flags.sql — one definition of "test account".
--
-- APPLIED 2026-10-07 after f342ae3d deployed (125 then 126). Originally: Tested in a rolled-back transaction against the live
-- database on 2026-10-07 (database/tests/125_test_account_flags.test.sql).
--
-- ── Owner decision 1 (2026-10-07) ────────────────────────────────────
-- Two flags mean "this account is not a real student" and were never
-- unified:
--   users.is_internal               (064)  set by the team in SQL
--   study_user_prefs.is_test_user   (084)  set in the admin study console
-- (There is no users.is_test_user column; the console flag lives on
-- study_user_prefs.) On 2026-10-07, 44 accounts carried is_test_user and
-- NOT is_internal, so study_item_calibration — which read only
-- is_internal — counted their attempts as real students. The owner's call:
-- treat the two flags the same everywhere "real student" is decided.
--
-- Measured 2026-10-07: of those 44, 6 have sessions and ONE has attempts
-- (the E2E camp fixture, 190 answered on live items). study_item_calibration
-- counts 4,901 attempts today and 4,711 after this migration.
--
-- Rather than copy one flag into the other (two writers, drift again),
-- this adds ONE view, study_test_accounts, that is the union of both, and
-- points every SQL consumer at it. The TS side has the same union in
-- src/lib/study/test-accounts.ts.
--
-- ── What changes ─────────────────────────────────────────────────────
-- 1. public.study_test_accounts   new view; service_role only.
-- 2. public.study_item_calibration excludes both flags (was is_internal
--    only). Also fixes a latent bug in the same line: the exclusion sat in
--    WHERE on a LEFT JOIN, so an item whose ONLY attempts were internal
--    vanished from the view instead of appearing with attempts = 0. The
--    filter now sits in the join condition. Column list unchanged.
-- 3. admin_study_session_stats / admin_study_event_counts (the study
--    numbers on /admin analytics) exclude test accounts by default. A new
--    trailing p_include_test boolean DEFAULT false reveals them, wired to
--    the panel's existing ?includeTest=1 convention. Dropped and recreated
--    because adding a defaulted argument via CREATE OR REPLACE would leave
--    an ambiguous two-argument overload.
-- 4. Data: users.is_internal = true on the E2E camp fixture accounts
--    (owner decision 3). Exact ids below.

begin;

-- ── 1. The one definition ────────────────────────────────────────────
create or replace view public.study_test_accounts
with (security_invoker = true) as
  select coalesce(u.id, p.student_id)       as user_id,
         coalesce(u.is_internal, false)     as is_internal,
         coalesce(p.is_test_user, false)    as is_study_test_user
    from (select id, is_internal from public.users where is_internal) u
    full join (select student_id, is_test_user from public.study_user_prefs where is_test_user) p
      on p.student_id = u.id;

comment on view public.study_test_accounts is
  'Every account that is NOT a real student: users.is_internal OR '
  'study_user_prefs.is_test_user. The single SQL definition (125); '
  'src/lib/study/test-accounts.ts is its TS twin. Service role only.';

revoke all on public.study_test_accounts from public, anon, authenticated;
grant select on public.study_test_accounts to service_role;

comment on column public.study_user_prefs.is_test_user is
  'Operator-set flag: internal/test account. Set only via the admin console '
  '(service role). Equivalent to users.is_internal for every real-student '
  'decision since 125 — read both through public.study_test_accounts.';

comment on column public.users.is_internal is
  'True for team/test/demo accounts. Excluded from item difficulty '
  'calibration and from any analysis meant to describe real student '
  'behaviour. Set explicitly — never inferred from the email address. '
  'Equivalent to study_user_prefs.is_test_user for every real-student '
  'decision since 125 — read both through public.study_test_accounts.';

-- ── 2. study_item_calibration ────────────────────────────────────────
create or replace view public.study_item_calibration
with (security_invoker = true) as
 select b.id as item_id,
    b.family,
    b.section,
    b.cohort,
    b.item_type,
    b.difficulty as labelled_difficulty,
    b.item ->> 'listeningTask'::text as listening_task,
    b.item ->> 'readingTask'::text as reading_task,
    b.item ->> 'cefr'::text as labelled_cefr,
    count(a.id) as attempts,
    count(a.id) filter (where a.is_correct) as correct,
    round(count(a.id) filter (where a.is_correct)::numeric / nullif(count(a.id), 0)::numeric, 3) as p_value,
        case
            when count(a.id) < 30 then null::text
            when (count(a.id) filter (where a.is_correct)::numeric / count(a.id)::numeric) >= 0.85 then 'easy'::text
            when (count(a.id) filter (where a.is_correct)::numeric / count(a.id)::numeric) >= 0.55 then 'medium'::text
            else 'hard'::text
        end as measured_difficulty
   from public.study_item_bank b
     left join (public.study_attempts a
                join public.study_sessions s on s.id = a.session_id)
       on a.item_id = b.id
      and a.is_correct is not null
      and not exists (select 1 from public.study_test_accounts t where t.user_id = s.student_id)
  where b.verified and not b.archived
  group by b.id, b.family, b.section, b.cohort, b.item_type, b.difficulty,
    (b.item ->> 'listeningTask'::text), (b.item ->> 'readingTask'::text), (b.item ->> 'cefr'::text);

-- ── 3. Admin analytics RPCs ──────────────────────────────────────────
drop function if exists public.admin_study_session_stats(timestamptz, timestamptz);
drop function if exists public.admin_study_event_counts(timestamptz, timestamptz);

create function public.admin_study_session_stats(
  p_start timestamptz, p_end timestamptz, p_include_test boolean default false)
returns table(session_count bigint, completed_count bigint, avg_duration_minutes numeric)
language sql stable
set search_path to 'public'
as $function$
  select
    count(*)::bigint,
    count(*) filter (where completed_at is not null)::bigint,
    avg(extract(epoch from (completed_at - created_at)) / 60.0)
      filter (where completed_at is not null and completed_at > created_at)
  from public.study_sessions ss
  where ss.created_at >= p_start and ss.created_at < p_end
    and (p_include_test
         or not exists (select 1 from public.study_test_accounts t where t.user_id = ss.student_id));
$function$;

create function public.admin_study_event_counts(
  p_start timestamptz, p_end timestamptz, p_include_test boolean default false)
returns table(event text, cnt bigint)
language sql stable
set search_path to 'public'
as $function$
  select e.event, count(*)::bigint
  from public.study_analytics_events e
  where e.created_at >= p_start and e.created_at < p_end
    and (p_include_test
         or e.student_id is null
         or not exists (select 1 from public.study_test_accounts t where t.user_id = e.student_id))
  group by e.event
  order by 2 desc;
$function$;

revoke all on function public.admin_study_session_stats(timestamptz, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.admin_study_event_counts(timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.admin_study_session_stats(timestamptz, timestamptz, boolean) to service_role;
grant execute on function public.admin_study_event_counts(timestamptz, timestamptz, boolean) to service_role;

-- ── 4. Flag the E2E camp fixtures (owner decision 3) ─────────────────
-- Every account named "Camp E2E …" — created 2026-08-15/16 by the camp
-- end-to-end suite, all on camp.*.test@classraum.com. Until now the ONLY
-- thing keeping 84615e07's 192 attempts out of real-attempts.ts was the
-- blanket @classraum.com email rule this change removes (it also carries
-- is_test_user and is in the is_test E2E Camp academy, but is_internal is
-- the team's explicit flag and the owner asked for it).
--
--   84615e07-914b-4f6a-b816-fd26f237f5cf  camp.student.test   student, E2E Camp Test Academy, 13 sessions / 192 attempts, is_test_user already true
--   588d1c7e-7fdc-45cf-bafb-d6e0ff9dd3aa  camp.student2.test  student "Stranger Student", no academy, 0 sessions, is_test_user already true
--   0b3aecbb-cfd4-437a-af2a-dedc3a3c3656  camp.teacher.test   teacher, E2E Camp Test Academy
--   df7ab59c-cbe3-42bb-85c8-996d2c4adba9  camp.parent.test    parent "Camp E2E Parent"
--   eebbb7ce-b6c6-40c9-81dd-6ea60df60586  camp.parent2.test   parent "Camp E2E Unlinked Parent"
--
-- @demo.classraum.com: all 316 accounts already carry is_internal (064);
-- nothing to flag. real-attempts.ts still excludes that domain as a
-- belt for a future seed that forgets the flag.
--
-- Deliberately NOT flagged (other @classraum.com accounts, none with any
-- study session): daniel.kim@ (manager of the REAL academy Daniel Kim's
-- Hagwon), dohyun@ (student of that real academy — the owner should say
-- whether this is a person), kginicis@ / tour.demo@ (managers of is_test
-- academies; staff, never students), andy@ / support@ (super_admin).
update public.users
   set is_internal = true
 where id in (
   '84615e07-914b-4f6a-b816-fd26f237f5cf',
   '588d1c7e-7fdc-45cf-bafb-d6e0ff9dd3aa',
   '0b3aecbb-cfd4-437a-af2a-dedc3a3c3656',
   'df7ab59c-cbe3-42bb-85c8-996d2c4adba9',
   'eebbb7ce-b6c6-40c9-81dd-6ea60df60586'
 )
   and not is_internal;

commit;
