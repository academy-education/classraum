-- Rolled-back test for migration 124. Run as ONE statement batch:
--
--   begin;
--   \i database/migrations/124_item_hardening.sql   (minus its own begin/commit)
--   \i database/tests/124_item_hardening.test.sql
--   rollback;
--
-- scripts/study-bank/hardening-migration-test.mjs assembles exactly that
-- and prints it for the Supabase SQL runner. Every assertion RAISEs, so a
-- run that reaches the final NOTICE passed all of them; the rollback means
-- nothing it did survives.
--
-- Each guard is attacked, not just exercised: the test asserts that the
-- WRONG call fails, not only that the right one succeeds.
do $$
declare
  v_orig    public.study_item_bank%rowtype;
  v_item    jsonb;
  v_edit    uuid;
  v_edit2   uuid;
  v_staged  uuid;
  v_res     text;
  v_live_before int;
  v_live_after  int;
  v_failed  boolean;
  v_reviews_fresh_before int;
  v_reviews_fresh_after  int;
begin
  -- A live, verified MC item with four string choices.
  select * into v_orig from public.study_item_bank
   where verified and not archived and jsonb_typeof(item->'choices') = 'array'
     and jsonb_array_length(item->'choices') = 4 and item ? 'correct_answer'
     and family = 'sat' and section = 'math'
   order by id limit 1;
  if v_orig.id is null then raise exception 'no fixture item'; end if;

  select count(*) into v_live_before from public.study_item_bank where verified and not archived;
  select count(*) into v_reviews_fresh_before from public.study_item_reviews_fresh where item_id = v_orig.id;

  -- 1. An explanation-only edit is refused (no content change).
  v_failed := false;
  begin
    perform public.study_item_hardening_stage(v_orig.id,
      jsonb_set(v_orig.item, '{explanation}', '"different words"'::jsonb),
      '00000000-0000-0000-0000-000000000001', v_orig.content_sha, array['explanation'], null);
  exception when others then v_failed := sqlerrm like '%changes no stem%';
  end;
  if not v_failed then raise exception 'T1: explanation-only edit was not refused with the right reason'; end if;

  -- 2. A stale sha is refused.
  v_item := jsonb_set(v_orig.item, '{prompt}', to_jsonb((v_orig.item->>'prompt') || ' [hardening test]'));
  v_failed := false;
  begin
    perform public.study_item_hardening_stage(v_orig.id, v_item,
      '00000000-0000-0000-0000-000000000001', 'not-the-sha', array['prompt'], null);
  exception when others then v_failed := sqlerrm like '%stale%';
  end;
  if not v_failed then raise exception 'T2: stale sha was not refused'; end if;

  -- 3. A key that is not among the choices is refused.
  v_failed := false;
  begin
    perform public.study_item_hardening_stage(v_orig.id,
      jsonb_set(v_item, '{correct_answer}', '"__not_an_option__"'::jsonb),
      '00000000-0000-0000-0000-000000000001', v_orig.content_sha, array['prompt'], null);
  exception when others then v_failed := sqlerrm like '%not one of the choices%';
  end;
  if not v_failed then raise exception 'T3: key outside choices was not refused'; end if;

  -- 4. A real edit STAGES: new unverified row, original untouched and live.
  v_edit := public.study_item_hardening_stage(v_orig.id, v_item,
    '00000000-0000-0000-0000-000000000001', v_orig.content_sha, array['prompt'], 'test');
  select staged_id into v_staged from public.study_item_hardening_edits where id = v_edit;
  if not exists (select 1 from public.study_item_bank where id = v_staged and verified = false and archived = false
                 and item->>'prompt' = v_item->>'prompt' and content_hash is null
                 and verify_meta->'hardening'->>'original_id' = v_orig.id::text) then
    raise exception 'T4: staged row missing or wrong shape';
  end if;
  if not exists (select 1 from public.study_item_bank where id = v_orig.id and verified and not archived
                 and content_sha = v_orig.content_sha and item = v_orig.item) then
    raise exception 'T4: ORIGINAL was modified by stage()';
  end if;
  select count(*) into v_live_after from public.study_item_bank where verified and not archived;
  if v_live_after <> v_live_before then raise exception 'T4: live count changed on stage (% -> %)', v_live_before, v_live_after; end if;
  select count(*) into v_reviews_fresh_after from public.study_item_reviews_fresh where item_id = v_orig.id;
  if v_reviews_fresh_after <> v_reviews_fresh_before then raise exception 'T4: staging made the original''s reviews stale'; end if;

  -- 5. A second save while queued REPLACES the staged text, same edit, same row.
  v_edit2 := public.study_item_hardening_stage(v_orig.id,
    jsonb_set(v_item, '{prompt}', to_jsonb((v_orig.item->>'prompt') || ' [hardening test v2]')),
    '00000000-0000-0000-0000-000000000001', v_orig.content_sha, array['prompt'], 'test v2');
  if v_edit2 <> v_edit then raise exception 'T5: re-save created a second edit'; end if;
  if (select count(*) from public.study_item_bank where verify_meta->'hardening'->>'original_id' = v_orig.id::text) <> 1 then
    raise exception 'T5: re-save created a second staged row';
  end if;

  -- 6. swap() refuses an edit that has not passed the gate.
  v_failed := false;
  begin perform public.study_item_hardening_swap(v_edit);
  exception when others then v_failed := sqlerrm like '%only a passed edit%';
  end;
  if not v_failed then raise exception 'T6: swap of a queued edit was not refused'; end if;

  -- 7. Once in the gate, a re-save is refused (frozen).
  update public.study_item_hardening_edits set status = 'in_gate', gate_run_id = 'test-run' where id = v_edit;
  v_failed := false;
  begin
    perform public.study_item_hardening_stage(v_orig.id, v_item,
      '00000000-0000-0000-0000-000000000001', v_orig.content_sha, array['prompt'], null);
  exception when others then v_failed := sqlerrm like '%already in the gate%';
  end;
  if not v_failed then raise exception 'T7: re-save during gate was not refused'; end if;

  -- 8. Passed, but graded against DIFFERENT text -> stale, nothing swapped.
  update public.study_item_hardening_edits
     set status = 'passed', gate_sha = 'some-other-sha', gate_result = '{"difficulty":"hard"}'::jsonb
   where id = v_edit;
  v_res := public.study_item_hardening_swap(v_edit);
  if v_res <> 'staged_changed_since_gate' then raise exception 'T8: expected staged_changed_since_gate, got %', v_res; end if;
  if exists (select 1 from public.study_item_bank where id = v_orig.id and archived) then raise exception 'T8: original archived on a stale grade'; end if;

  -- 9. Passed at the right sha -> swap: original archived, staged live + hard.
  update public.study_item_hardening_edits
     set status = 'passed', gate_sha = (select content_sha from public.study_item_bank where id = v_staged)
   where id = v_edit;
  v_res := public.study_item_hardening_swap(v_edit);
  if v_res <> 'swapped' then raise exception 'T9: expected swapped, got %', v_res; end if;
  if not exists (select 1 from public.study_item_bank where id = v_orig.id and archived
                 and verify_meta->>'hardened_into' = v_staged::text) then
    raise exception 'T9: original not archived with a pointer';
  end if;
  if not exists (select 1 from public.study_item_bank where id = v_staged and verified and not archived
                 and difficulty = 'hard' and item->>'difficulty' = 'hard') then
    raise exception 'T9: staged row not live / not hard';
  end if;
  select count(*) into v_live_after from public.study_item_bank where verified and not archived;
  if v_live_after <> v_live_before then raise exception 'T9: live count changed on swap (% -> %), should be one-for-one', v_live_before, v_live_after; end if;

  -- 10. Idempotent: a second swap is a no-op.
  v_res := public.study_item_hardening_swap(v_edit);
  if v_res <> 'already_swapped' then raise exception 'T10: second swap returned %', v_res; end if;
  select count(*) into v_live_after from public.study_item_bank where verified and not archived;
  if v_live_after <> v_live_before then raise exception 'T10: second swap changed the live count'; end if;

  -- 11. The original's reviews stay bound to the original (not moved, not freshened onto new text).
  if exists (select 1 from public.study_item_reviews where item_id = v_staged) then
    raise exception 'T11: reviews appeared on the staged row';
  end if;

  -- 12. Non-service roles cannot execute either function.
  if has_function_privilege('authenticated', 'public.study_item_hardening_swap(uuid)', 'execute')
     or has_function_privilege('anon', 'public.study_item_hardening_swap(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.study_item_hardening_stage(uuid, jsonb, uuid, text, text[], text)', 'execute') then
    raise exception 'T12: hardening functions executable by a client role';
  end if;

  raise notice '124 hardening test: 12/12 passed (rolled back)';
end $$;
