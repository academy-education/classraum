-- Rolled-back test for migration 125. Run as ONE batch:
--
--   node scripts/migration-rollback-test.mjs 125_test_account_flags
--
-- prints begin; <migration minus its begin/commit> <this file> rollback;
-- for the Supabase SQL runner. Every assertion RAISEs; the batch only
-- reaches rollback if all passed. Expected values are computed from the
-- BASE tables, never from the objects under test.
do $$
declare
  v_n            bigint;
  v_expect       bigint;
  v_internal_only uuid;
  v_prefs_only    uuid;
  v_all          bigint;
  v_real         bigint;
  v_real_student uuid;
  v_their        bigint;
  v_after        bigint;
begin
  -- 1. The view is exactly the union of the two flags.
  select count(*) into v_expect from (
    select id from public.users where is_internal
    union
    select student_id from public.study_user_prefs where is_test_user) x;
  select count(*) into v_n from public.study_test_accounts;
  if v_n <> v_expect then raise exception 'T1: study_test_accounts has % rows, union of flags is %', v_n, v_expect; end if;
  select count(*) into v_n from (select user_id from public.study_test_accounts group by user_id having count(*) > 1) d;
  if v_n <> 0 then raise exception 'T1: % duplicate user ids in study_test_accounts', v_n; end if;

  -- 2. Each flag ALONE puts an account in the view (attack each side).
  select u.id into v_internal_only from public.users u
   where u.is_internal and not exists (select 1 from public.study_user_prefs p where p.student_id = u.id and p.is_test_user) limit 1;
  select p.student_id into v_prefs_only from public.study_user_prefs p join public.users u on u.id = p.student_id
   where p.is_test_user and not u.is_internal limit 1;
  if v_internal_only is null or v_prefs_only is null then raise exception 'T2: no fixture for one of the flags'; end if;
  if not exists (select 1 from public.study_test_accounts where user_id = v_internal_only and is_internal and not is_study_test_user)
    then raise exception 'T2: an is_internal-only account is missing'; end if;
  if not exists (select 1 from public.study_test_accounts where user_id = v_prefs_only and is_study_test_user and not is_internal)
    then raise exception 'T2: an is_test_user-only account is missing'; end if;

  -- 3. The five E2E camp fixtures are now is_internal; nobody else changed.
  select count(*) into v_n from public.users where is_internal and id in (
    '84615e07-914b-4f6a-b816-fd26f237f5cf','588d1c7e-7fdc-45cf-bafb-d6e0ff9dd3aa',
    '0b3aecbb-cfd4-437a-af2a-dedc3a3c3656','df7ab59c-cbe3-42bb-85c8-996d2c4adba9',
    'eebbb7ce-b6c6-40c9-81dd-6ea60df60586');
  if v_n <> 5 then raise exception 'T3: % of 5 camp fixtures flagged', v_n; end if;

  -- 4. Calibration attempts = attempts by accounts in NEITHER flag.
  select count(*) into v_expect
    from public.study_attempts a
    join public.study_sessions s on s.id = a.session_id
    join public.study_item_bank b on b.id = a.item_id and b.verified and not b.archived
   where a.is_correct is not null
     and not exists (select 1 from public.users u where u.id = s.student_id and u.is_internal)
     and not exists (select 1 from public.study_user_prefs p where p.student_id = s.student_id and p.is_test_user);
  select coalesce(sum(attempts), 0) into v_n from public.study_item_calibration;
  if v_n <> v_expect then raise exception 'T4: calibration counts % attempts, expected %', v_n, v_expect; end if;
  -- ...and strictly fewer than the PRE-125 view counted (is_internal only,
  -- and without this migration's flags). On live data the two differ by
  -- exactly the camp fixture's attempts, so this proves 125 changed the count.
  select count(*) into v_all
    from public.study_attempts a
    join public.study_sessions s on s.id = a.session_id
    join public.study_item_bank b on b.id = a.item_id and b.verified and not b.archived
   where a.is_correct is not null
     and not exists (select 1 from public.users u where u.id = s.student_id and u.is_internal
                       and u.id not in ('84615e07-914b-4f6a-b816-fd26f237f5cf','588d1c7e-7fdc-45cf-bafb-d6e0ff9dd3aa',
                                        '0b3aecbb-cfd4-437a-af2a-dedc3a3c3656','df7ab59c-cbe3-42bb-85c8-996d2c4adba9',
                                        'eebbb7ce-b6c6-40c9-81dd-6ea60df60586'));
  if not (v_n < v_all) then raise exception 'T4: 125 removed nothing from calibration (% vs pre-125 %)', v_n, v_all; end if;

  -- 4b. Attack EACH flag on its own. The camp account carries both, so the
  -- live data cannot tell the halves apart; pick an unflagged student with
  -- live-item attempts, flag them one way, then the other, and watch the
  -- calibration total drop by exactly their attempts each time.
  select s.student_id, count(*) into v_real_student, v_their
    from public.study_attempts a
    join public.study_sessions s on s.id = a.session_id
    join public.study_item_bank b on b.id = a.item_id and b.verified and not b.archived
   where a.is_correct is not null
     and not exists (select 1 from public.study_test_accounts t where t.user_id = s.student_id)
     and exists (select 1 from public.study_user_prefs p where p.student_id = s.student_id)
   group by s.student_id order by count(*) desc limit 1;
  if v_real_student is null then raise exception 'T4b: no unflagged student with attempts'; end if;
  update public.study_user_prefs set is_test_user = true where student_id = v_real_student;
  select coalesce(sum(attempts), 0) into v_after from public.study_item_calibration;
  if v_after <> v_n - v_their then raise exception 'T4b: is_test_user alone: % -> %, expected drop of %', v_n, v_after, v_their; end if;
  update public.study_user_prefs set is_test_user = false where student_id = v_real_student;
  update public.users set is_internal = true where id = v_real_student;
  select coalesce(sum(attempts), 0) into v_after from public.study_item_calibration;
  if v_after <> v_n - v_their then raise exception 'T4b: is_internal alone: % -> %, expected drop of %', v_n, v_after, v_their; end if;
  update public.users set is_internal = false where id = v_real_student;

  -- 5. Every live item has a row (the vanishing-item fix).
  select count(*) into v_expect from public.study_item_bank where verified and not archived;
  select count(*) into v_n from public.study_item_calibration;
  if v_n <> v_expect then raise exception 'T5: calibration has % rows for % live items', v_n, v_expect; end if;

  -- 6. Analytics RPCs: default excludes, p_include_test reveals, old 2-arg call resolves.
  select count(*) into v_all  from public.study_sessions where created_at >= '2020-01-01';
  select count(*) into v_real from public.study_sessions ss where created_at >= '2020-01-01'
     and not exists (select 1 from public.study_test_accounts t where t.user_id = ss.student_id);
  if v_all = v_real then raise exception 'T6: no test sessions to exclude — test cannot discriminate'; end if;
  select session_count into v_n from public.admin_study_session_stats('2020-01-01', now() + interval '1 day');
  if v_n <> v_real then raise exception 'T6: default session_count % <> real %', v_n, v_real; end if;
  select session_count into v_n from public.admin_study_session_stats('2020-01-01', now() + interval '1 day', true);
  if v_n <> v_all then raise exception 'T6: include_test session_count % <> all %', v_n, v_all; end if;

  select count(*) into v_all from public.study_analytics_events where created_at >= '2020-01-01';
  select coalesce(sum(cnt), 0) into v_n from public.admin_study_event_counts('2020-01-01', now() + interval '1 day', true);
  if v_n <> v_all then raise exception 'T6: include_test events % <> all %', v_n, v_all; end if;
  select count(*) into v_real from public.study_analytics_events e where created_at >= '2020-01-01'
     and (e.student_id is null or not exists (select 1 from public.study_test_accounts t where t.user_id = e.student_id));
  select coalesce(sum(cnt), 0) into v_n from public.admin_study_event_counts('2020-01-01', now() + interval '1 day');
  if v_n <> v_real then raise exception 'T6: default events % <> real %', v_n, v_real; end if;

  -- 7. Nothing new is reachable by signed-in clients.
  if has_table_privilege('authenticated', 'public.study_test_accounts', 'select') then raise exception 'T7: authenticated can read study_test_accounts'; end if;
  if has_table_privilege('anon', 'public.study_test_accounts', 'select') then raise exception 'T7: anon can read study_test_accounts'; end if;
  if has_function_privilege('authenticated', 'public.admin_study_session_stats(timestamptz,timestamptz,boolean)', 'execute') then raise exception 'T7: authenticated can run session stats'; end if;
  if has_function_privilege('anon', 'public.admin_study_event_counts(timestamptz,timestamptz,boolean)', 'execute') then raise exception 'T7: anon can run event counts'; end if;
  if not has_function_privilege('service_role', 'public.admin_study_event_counts(timestamptz,timestamptz,boolean)', 'execute') then raise exception 'T7: service_role lost event counts'; end if;
  if (select reloptions from pg_class where oid = 'public.study_item_calibration'::regclass) is distinct from array['security_invoker=true'] then raise exception 'T7: calibration lost security_invoker'; end if;

  raise notice '125 test: all assertions passed';
end $$;
