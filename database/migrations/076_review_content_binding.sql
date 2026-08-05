-- Bind a human review to the CONTENT it judged, not just to the row id.
--
-- NOT APPLIED. Review before running.
--
-- ── The gap ──────────────────────────────────────────────────────────
-- study_item_reviews (migration 075) references study_item_bank(id) and
-- nothing else. Edit an item after someone has reviewed it and the old
-- review silently keeps counting: the dashboard still reports that a
-- human scored 55.0% blind on a cohort whose items have since changed.
--
-- Migration 067 already solved this shape for QC batches --
--
--     content_sha ... THE load-bearing column: every QC run is bound to
--     the exact content it judged, so editing an item after review
--     invalidates its passes instead of silently keeping them.
--
-- -- and the review table never got the same treatment. This closes it.
--
-- ── Why now ──────────────────────────────────────────────────────────
-- Three known data defects sit INSIDE the 72 items already reviewed:
-- one mis-keyed Daily Life item, and "space permitting" misused in
-- three separate items. Fixing them is correct and will invalidate part
-- of the only human evidence in the project. That should be visible,
-- not silent.
--
-- Checked before writing this, read-only: 0 of 72 reviewed items have
-- been edited since their review, so the backfill below records a fact
-- rather than an assumption. If that check is re-run later and is no
-- longer 0, the backfill is wrong and those rows must be nulled.

alter table public.study_item_reviews
  add column if not exists item_sha text;

comment on column public.study_item_reviews.item_sha is
  'md5 of the item content this review judged. Set on insert by trigger. '
  'A review whose sha no longer matches its item is STALE and must not '
  'be counted — see study_item_reviews_fresh.';

/*
 * What goes into the hash, and what deliberately does not.
 *
 * The reviewer judged the prompt, the options, the key and the passage.
 * They did NOT judge `difficulty`, `verify_meta`, or any bookkeeping
 * field, so those must not invalidate a review when they change — a
 * hash over the whole jsonb would expire every review the next time a
 * QC script stamped a metadata key, and a check that fires constantly
 * gets ignored exactly like a check that never fires.
 *
 * `choices` is hashed in its STORED order. The presented order is
 * per-reviewer and already recorded in shown_order; what matters here
 * is whether the option TEXT changed.
 *
 * jsonb normalises key order on storage, so ::text is deterministic for
 * a given value and md5 over it is stable across sessions.
 */
create or replace function public.study_item_content_sha(p_item jsonb)
returns text
language sql
immutable
as $$
  -- chr(31) rather than a literal control byte between the quotes. The
  -- byte works, but it is invisible in every diff and one stray editor
  -- "trim whitespace" away from silently becoming an empty separator —
  -- at which point ("ab","c") and ("a","bc") hash the same and an edit
  -- to the prompt could be cancelled by an edit to an option.
  --
  -- (p_item->'choices')::text needs its parentheses: without them,
  -- p_item->'choices'::text parses as p_item->('choices'::text), which
  -- yields jsonb and does not concatenate with text at all.
  select md5(
    coalesce(p_item->>'prompt', '')          || chr(31) ||
    coalesce(p_item->>'passage', '')         || chr(31) ||
    coalesce(p_item->>'correct_answer', '')  || chr(31) ||
    coalesce((p_item->'choices')::text, '')
  );
$$;

-- Backfill. Justified by the read-only check recorded in the header:
-- every reviewed item is unmodified since its review, so its CURRENT
-- content is the content that was judged.
update public.study_item_reviews r
   set item_sha = public.study_item_content_sha(b.item)
  from public.study_item_bank b
 where b.id = r.item_id
   and r.item_sha is null;

/*
 * Stamp on insert, from the item as it stands at that moment.
 *
 * A trigger rather than the API route, for the same reason 075 sealed
 * phase 1 in the database: the review panel is not the only writer.
 * scripts/study-bank/draw-review-run.mjs inserts rows directly with the
 * service role, and a rule enforced only in the route is a rule that
 * one script quietly does not follow.
 */
create or replace function public.study_item_reviews_stamp_sha()
returns trigger
language plpgsql
as $$
begin
  if new.item_sha is null then
    select public.study_item_content_sha(b.item) into new.item_sha
      from public.study_item_bank b where b.id = new.item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists study_item_reviews_stamp_sha on public.study_item_reviews;
create trigger study_item_reviews_stamp_sha
  before insert on public.study_item_reviews
  for each row execute function public.study_item_reviews_stamp_sha();

/*
 * The view readers should use.
 *
 * Deliberately a view of FRESH rows rather than a `stale` boolean on
 * the table: a boolean has to be maintained, and the one thing this
 * migration exists to prevent is evidence going stale without anyone
 * noticing. Recomputing on read cannot drift.
 *
 * Stale rows are NOT deleted. A review of an item as it was is a real
 * historical fact and the thing you want when asking "did the repair
 * change anything" — it is just not evidence about the item today.
 */
create or replace view public.study_item_reviews_fresh as
select r.*
  from public.study_item_reviews r
  join public.study_item_bank b on b.id = r.item_id
 where r.item_sha is not null
   and r.item_sha = public.study_item_content_sha(b.item);

comment on view public.study_item_reviews_fresh is
  'Reviews that still describe their item. Anything counted as human '
  'evidence must come from here, not from study_item_reviews.';

/*
 * Self-test, run at apply time in the same transaction as the DDL —
 * the pattern 075 used. A trigger nobody has seen fire is a trigger
 * that might not, and this one is the whole point of the migration.
 */
do $$
declare
  v_item_id uuid;
  v_sha     text;
  v_fresh   int;
  v_prompt  text;   -- the ORIGINAL prompt, so the mutation can be undone
begin
  select id, item->>'prompt' into v_item_id, v_prompt
    from public.study_item_bank limit 1;
  if v_item_id is null then
    raise notice 'study_item_bank empty — trigger self-test skipped';
    return;
  end if;

  insert into public.study_item_reviews
    (item_id, run_id, reviewer_id, shown_order, key_slot, blind_pick, blind_at)
  values
    (v_item_id, '__sha_selftest__', '00000000-0000-0000-0000-000000000000',
     '["A","B","C","D"]'::jsonb, 'A', 'A', now());

  select item_sha into v_sha from public.study_item_reviews
   where run_id = '__sha_selftest__';
  if v_sha is null then
    raise exception 'trigger did not stamp item_sha';
  end if;

  select count(*) into v_fresh from public.study_item_reviews_fresh
   where run_id = '__sha_selftest__';
  if v_fresh <> 1 then
    raise exception 'a freshly stamped review is not in study_item_reviews_fresh';
  end if;

  -- And it must go STALE when the content changes. Mutate, check, undo.
  update public.study_item_bank
     set item = jsonb_set(item, '{prompt}', to_jsonb('__sha_selftest_mutated__'::text))
   where id = v_item_id;

  select count(*) into v_fresh from public.study_item_reviews_fresh
   where run_id = '__sha_selftest__';
  if v_fresh <> 0 then
    raise exception 'review survived an edit to the item it judged — the binding does not work';
  end if;

  /*
   * Undo the mutation INSIDE the block, using the saved original.
   *
   * A first draft restored it with replace(prompt, marker, '') as a
   * separate statement afterwards — which does not restore anything, it
   * leaves the item with an EMPTY prompt. A self-test that corrupts a
   * live item to prove a trigger works is worse than no self-test.
   *
   * Inside the block, so a raise above rolls the mutation back with the
   * transaction rather than leaving it applied.
   */
  update public.study_item_bank
     set item = jsonb_set(item, '{prompt}', to_jsonb(coalesce(v_prompt, '')))
   where id = v_item_id;

  if exists (select 1 from public.study_item_bank
              where id = v_item_id and item->>'prompt' is distinct from v_prompt) then
    raise exception 'self-test failed to restore the item it mutated';
  end if;

  delete from public.study_item_reviews where run_id = '__sha_selftest__';

  raise notice 'self-test passed: stamped on insert, went stale on edit, item restored';
end $$;
