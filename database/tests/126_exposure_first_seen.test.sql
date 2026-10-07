-- Rolled-back test for migration 126. Run as ONE batch:
--
--   node scripts/migration-rollback-test.mjs 126_exposure_first_seen
--
-- Every assertion RAISEs; the batch only reaches rollback if all passed.
-- The write-once guard is ATTACKED: the upsert the app actually sends, an
-- upsert that names first_seen_at, and a direct UPDATE all try to move it.
do $$
declare
  v_n        bigint;
  v_expect   bigint;
  v_student  uuid;
  v_item     uuid;
  v_s1       uuid := gen_random_uuid();
  v_s2       uuid := gen_random_uuid();
  v_t1       timestamptz := '2026-01-01T00:00:00Z';
  v_t2       timestamptz := '2026-02-01T00:00:00Z';
  r          record;
begin
  -- 1. Backfill: every row has a first sighting, never after seen_at.
  select count(*) into v_n from public.study_item_exposures where first_seen_at is null;
  if v_n <> 0 then raise exception 'T1: % rows with null first_seen_at', v_n; end if;
  select count(*) into v_n from public.study_item_exposures where first_seen_at > seen_at;
  if v_n <> 0 then raise exception 'T1: % rows first seen AFTER their latest serve', v_n; end if;

  -- 2. Backfill moved exactly the rows with an earlier attempt, to that attempt.
  select count(*) into v_expect from public.study_item_exposures e
   where exists (select 1 from public.study_attempts a join public.study_sessions s on s.id = a.session_id
                  where s.student_id = e.student_id and a.item_id = e.item_id and a.created_at < e.seen_at);
  select count(*) into v_n from public.study_item_exposures where first_seen_at < seen_at;
  if v_n <> v_expect then raise exception 'T2: % rows moved earlier, % have an earlier attempt', v_n, v_expect; end if;
  if v_expect = 0 then raise exception 'T2: no re-served rows — backfill untested'; end if;
  select count(*) into v_n from public.study_item_exposures e
   where first_seen_at < seen_at
     and not exists (select 1 from public.study_attempts a
                      where a.session_id = e.first_seen_session_id and a.item_id = e.item_id and a.created_at = e.first_seen_at);
  if v_n <> 0 then raise exception 'T2: % moved rows whose (time, session) is not an actual attempt', v_n; end if;
  -- rows not moved keep seen_at AND session_id as a pair
  select count(*) into v_n from public.study_item_exposures
   where first_seen_at = seen_at and first_seen_session_id is distinct from session_id;
  if v_n <> 0 then raise exception 'T2: % unmoved rows with a mismatched session', v_n; end if;

  -- Fixture: a real student and an item they have never been served.
  select e.student_id into v_student from public.study_item_exposures e limit 1;
  select b.id into v_item from public.study_item_bank b
   where not exists (select 1 from public.study_item_exposures x where x.student_id = v_student and x.item_id = b.id)
   limit 1;

  -- 3. INSERT sets first_* from seen_at/session_id and ignores a supplied value.
  insert into public.study_item_exposures (student_id, item_id, source, session_id, seen_at, first_seen_at, first_seen_session_id)
  values (v_student, v_item, 'test', v_s1, v_t1, '1999-01-01', v_s2);
  select * into r from public.study_item_exposures where student_id = v_student and item_id = v_item;
  if r.first_seen_at <> v_t1 or r.first_seen_session_id <> v_s1 then
    raise exception 'T3: insert set first_seen to (%, %), expected (%, %)', r.first_seen_at, r.first_seen_session_id, v_t1, v_s1; end if;

  -- 4. The app's upsert (assemble.ts recordExposures) re-serves: seen_at moves, first_* do not.
  insert into public.study_item_exposures (student_id, item_id, source, session_id, seen_at)
  values (v_student, v_item, 'test', v_s2, v_t2)
  on conflict (student_id, item_id) do update
     set source = excluded.source, session_id = excluded.session_id, seen_at = excluded.seen_at;
  select * into r from public.study_item_exposures where student_id = v_student and item_id = v_item;
  if r.seen_at <> v_t2 or r.session_id <> v_s2 then raise exception 'T4: upsert did not refresh seen_at/session_id'; end if;
  if r.first_seen_at <> v_t1 or r.first_seen_session_id <> v_s1 then
    raise exception 'T4: re-serve overwrote first_seen (now %, %)', r.first_seen_at, r.first_seen_session_id; end if;

  -- 5. An upsert that NAMES the first_* columns cannot move them either.
  insert into public.study_item_exposures (student_id, item_id, source, session_id, seen_at, first_seen_at, first_seen_session_id)
  values (v_student, v_item, 'test', v_s2, v_t2, v_t2, v_s2)
  on conflict (student_id, item_id) do update
     set first_seen_at = excluded.first_seen_at, first_seen_session_id = excluded.first_seen_session_id;
  select * into r from public.study_item_exposures where student_id = v_student and item_id = v_item;
  if r.first_seen_at <> v_t1 or r.first_seen_session_id <> v_s1 then raise exception 'T5: explicit upsert moved first_seen'; end if;

  -- 6. Nor can a direct UPDATE, including to NULL.
  update public.study_item_exposures set first_seen_at = null, first_seen_session_id = null
   where student_id = v_student and item_id = v_item;
  select * into r from public.study_item_exposures where student_id = v_student and item_id = v_item;
  if r.first_seen_at <> v_t1 or r.first_seen_session_id <> v_s1 then raise exception 'T6: direct update moved first_seen'; end if;

  raise notice '126 test: all assertions passed';
end $$;
