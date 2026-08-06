-- Bind every measurement to the content it measured, and make the
-- duplicate guard actually guard.
--
-- Closes register items A8 and A9. They are one problem.
--
-- ── The shape ────────────────────────────────────────────────────────
-- Migration 076 bound REVIEWS to item content: a review whose item has
-- changed stops counting. Two other things needed the same property and
-- did not get it.
--
-- A8. study_item_attacks has no content binding. Repointing an item —
--     replacing its question — leaves the old blind score attached to a
--     question the item no longer asks, and the dashboard reads the
--     latest attack per item. Five items are in that state right now,
--     carrying a hand-written `repointed_at` marker because there was
--     nothing better.
--
-- A9. The unique partial index on content_hash READS as a duplicate
--     guarantee and is not one. content_hash is computed by five
--     different definitions across the codebase, 36% of the bank was
--     written by a harvest script that exists in no commit, and 55% of
--     rows match no definition at all (CONTENT-HASH-FINDING.md). A
--     re-harvest computes its hash differently, so it misses both the
--     in-memory `seen` set and the index, and the duplicate inserts
--     cleanly. Migration 062 already recorded this happening: "28
--     items, 14 distinct prompts".
--
-- ── The fix, and why it is columns rather than discipline ────────────
-- Nine scripts rewrite `item` and leave the hash stale; exactly one
-- recomputes it. That ratio is the argument: a rule enforced by
-- remembering is not enforced. GENERATED ALWAYS columns cannot be
-- forgotten by any writer, including the ones nobody has committed.
--
-- content_hash is left ALONE, not dropped. For 55% of rows the input is
-- gone, so it cannot be recomputed, and deleting it would destroy the
-- only record of what an older pipeline believed. It is documented as
-- unreliable instead.

-- ── 1. Exact content, for measurement binding ────────────────────────
-- study_item_content_sha() ships in migration 076 and is already
-- populated and verified against JS on 20/20 rows.
alter table public.study_item_bank
  add column if not exists content_sha text
  generated always as (public.study_item_content_sha(item)) stored;

comment on column public.study_item_bank.content_sha is
  'Exact content hash, maintained by the database. Measurements bind to '
  'this. Unlike content_hash it cannot be left stale by a writer.';

comment on column public.study_item_bank.content_hash is
  'UNRELIABLE and frozen. Five competing definitions across the codebase, '
  '55% of rows match none of them, and 36% of the bank was written by a '
  'harvest script that exists in no commit. Kept as history only — do not '
  'read it, do not backfill it. See scripts/study-bank/CONTENT-HASH-FINDING.md';

-- ── 2. Order-insensitive key, for dedup ──────────────────────────────
/*
 * A SECOND column, deliberately, rather than overloading one.
 *
 * The two jobs want different things. Measurement binding must be
 * EXACT: reshuffling the options changes what a solver saw, so a review
 * of the old order should go stale. Dedup must be order-INSENSITIVE:
 * the same item with its options shuffled is still the same item, and
 * both live duplicates found today are exactly that — identical content,
 * different option order, which is why the existing hash missed them.
 *
 * One column cannot be both without being wrong for one of them.
 */
create or replace function public.study_item_dedup_key(p_item jsonb)
returns text
language sql
immutable
as $$
  select md5(
    lower(regexp_replace(coalesce(p_item->>'passage',''), '[^a-zA-Z0-9]+', ' ', 'g')) || chr(31) ||
    lower(regexp_replace(coalesce(p_item->>'prompt', ''), '[^a-zA-Z0-9]+', ' ', 'g')) || chr(31) ||
    coalesce((
      select string_agg(lower(regexp_replace(c, '[^a-zA-Z0-9]+', ' ', 'g')), '|' order by 1)
        from jsonb_array_elements_text(coalesce(p_item->'choices', '[]'::jsonb)) as c
    ), '')
  );
$$;

alter table public.study_item_bank
  add column if not exists dedup_key text
  generated always as (public.study_item_dedup_key(item)) stored;

comment on column public.study_item_bank.dedup_key is
  'Order-insensitive content key. Two items with the same text and '
  'shuffled options share this. Used ONLY for duplicate prevention.';

/*
 * Resolve the two live duplicates before the constraint can exist.
 *
 * Both are harvest-v1 — the cohort written by the uncommitted script,
 * i.e. the same failure 062 recorded. Both have zero attacks and zero
 * reviews, so archiving one of each costs no measurement.
 *
 * Keeps the lexicographically smaller id, purely so the choice is
 * deterministic and re-runnable rather than dependent on scan order.
 * ARCHIVED, not deleted: the row survives and can be restored by
 * flipping the flag, which is the reversible version of this decision.
 */
update public.study_item_bank b
   set archived = true,
       verify_meta = coalesce(verify_meta, '{}'::jsonb)
         || jsonb_build_object(
              'archived_reason', 'duplicate of ' || keep.id::text || ' (migration 077, order-insensitive dedup)',
              'archived_at', now()
            )
  from (
    select dedup_key, min(id::text) as id
      from public.study_item_bank
     where archived is not true
     group by dedup_key
    having count(*) > 1
  ) keep
 where b.dedup_key = keep.dedup_key
   and b.archived is not true
   and b.id::text <> keep.id;

create unique index if not exists study_item_bank_dedup_uniq
  on public.study_item_bank (dedup_key)
  where archived is not true;

-- ── 3. Bind attacks to content, exactly as 076 did for reviews ───────
alter table public.study_item_attacks
  add column if not exists item_sha text;

comment on column public.study_item_attacks.item_sha is
  'Content hash of the item AT ATTACK TIME. A row whose sha no longer '
  'matches its item measured different text — see study_item_attacks_fresh.';

update public.study_item_attacks a
   set item_sha = b.content_sha
  from public.study_item_bank b
 where b.id = a.item_id
   and a.item_sha is null
   -- Only where the item demonstrably has NOT changed since. The five
   -- repointed items carry repointed_at and are deliberately left null,
   -- so they read as unmeasured rather than as measured-and-passing.
   and (b.verify_meta ? 'repointed_at') is not true
   and (b.verify_meta ? 'phrase_question_fixed_at') is not true;

create or replace function public.study_item_attacks_stamp_sha()
returns trigger
language plpgsql
as $$
begin
  if new.item_sha is null then
    select b.content_sha into new.item_sha
      from public.study_item_bank b where b.id = new.item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists study_item_attacks_stamp_sha on public.study_item_attacks;
create trigger study_item_attacks_stamp_sha
  before insert on public.study_item_attacks
  for each row execute function public.study_item_attacks_stamp_sha();

create or replace view public.study_item_attacks_fresh as
select a.*
  from public.study_item_attacks a
  join public.study_item_bank b on b.id = a.item_id
 where a.item_sha is not null
   and a.item_sha = b.content_sha;

comment on view public.study_item_attacks_fresh is
  'Attacks that still describe their item. Any blind score presented as '
  'evidence must come from here, not from study_item_attacks.';

-- ── 4. Self-test, in the same transaction ────────────────────────────
do $$
declare
  v_item   uuid;
  v_before int;
  v_after  int;
  v_prompt text;
begin
  select id, item->>'prompt' into v_item, v_prompt from public.study_item_bank
   where archived is not true limit 1;
  if v_item is null then raise notice 'bank empty — self-test skipped'; return; end if;

  insert into public.study_item_attacks (item_id, run_id, solvers, correct, attacked_at)
  values (v_item, '__sha_selftest__', 3, 1, now());

  select count(*) into v_before from public.study_item_attacks_fresh
   where run_id = '__sha_selftest__';
  if v_before <> 1 then
    raise exception 'a freshly stamped attack is not in study_item_attacks_fresh';
  end if;

  update public.study_item_bank
     set item = jsonb_set(item, '{prompt}', to_jsonb('__sha_selftest_mutated__'::text))
   where id = v_item;

  select count(*) into v_after from public.study_item_attacks_fresh
   where run_id = '__sha_selftest__';
  if v_after <> 0 then
    raise exception 'an attack survived an edit to the item it measured — the binding does not work';
  end if;

  update public.study_item_bank
     set item = jsonb_set(item, '{prompt}', to_jsonb(coalesce(v_prompt, '')))
   where id = v_item;
  if exists (select 1 from public.study_item_bank
              where id = v_item and item->>'prompt' is distinct from v_prompt) then
    raise exception 'self-test failed to restore the item it mutated';
  end if;

  delete from public.study_item_attacks where run_id = '__sha_selftest__';
  raise notice 'self-test passed: attacks stamp on insert, go stale on edit, item restored';
end $$;
