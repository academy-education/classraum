-- 075: study_item_reviews — the human instrument.
--
--
-- WHY A HUMAN PASS EXISTS AT ALL
--
-- Every automated check in this repo has now been fooled at least once,
-- and three times the SAME way: a regex or a model grader reported a
-- batch clean while a person reading the same items named the defect in
-- one pass.
--
--   * check-lexical-anchor.mjs scored nearmiss-v1 at 26.6% (chance is
--     25%) while two independent readers each found 3-4 of 16 items
--     solvable by word-matching alone.
--   * check-batch-variety.mjs, first draft, scored the same batch at
--     56.3% "one rhetorical shape" and PASSED it. Both readers counted
--     16 of 16.
--   * The same narrow regex scored the live Choose a Response cohort at
--     45.1%. Re-derived semantically and then in SQL: 94.4%.
--
-- The blind model attack is not a substitute either — it shares an
-- authoring lineage with the items and can miss what it was built to
-- miss. So this table stores judgements from a PERSON, and it is the
-- only measurement here that no script in this repo can talk itself
-- into.
--
--
-- WHY TWO PHASES, AND WHY THE DB ENFORCES THE ORDER
--
-- The review mirrors the two gates:
--
--   phase 1, BLIND    the four options only, shuffled. Which is the key?
--                     This is the guessability number, measured on a
--                     human rather than a solver.
--   phase 2, REVEALED stimulus + key shown. Is the key uniquely right?
--                     Does the item read authentic or authored-to-a-brief?
--
-- Phase 1 is worthless if it can be revised after phase 2 reveals the
-- answer, and "the UI won't let you" is exactly the kind of claim this
-- codebase has been burned by before — a duplicate-grading bug shipped
-- behind a comment asserting an invariant that had never been tested
-- with two callers. So the immutability is a TRIGGER, not a convention:
-- once blind_at is set, blind_pick can never change again, by any
-- caller, including a future script.
--
--
-- WHY ROWS ARE CREATED AT SAMPLE TIME, NOT AT SUBMIT TIME
--
-- A review is only evidence if its denominator is fixed in advance.
-- Rows are inserted when the sample is DRAWN, with blind_at null. So
-- "12 drawn, 9 reviewed, 3 skipped" is visible and cherry-picking a
-- flattering subset after the fact is not possible — the skipped rows
-- stay on the table.

begin;

create table if not exists public.study_item_reviews (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.study_item_bank(id) on delete cascade,
  -- Names the sitting, e.g. 'choose-response-2026-08-04'. A whole
  -- sample can be read, compared or discarded as a unit.
  run_id      text not null,
  -- auth.users.id of the reviewer. Two people reviewing the same sample
  -- is the point (agreement is the signal), so the reviewer is part of
  -- the identity of a row rather than a property of the run.
  reviewer_id uuid not null,

  -- The option order actually PRESENTED, e.g. ["A","C","D","B"] meaning
  -- slot 1 held the item's original A. Stored because the shuffle is
  -- per-reviewer: without it a blind pick cannot be scored later, and
  -- re-deriving it from a seed has already destroyed one experiment in
  -- this repo (a re-render moved 9 of 16 keys under readers' feet).
  shown_order jsonb not null,
  -- Which PRESENTED slot held the key, 'A'..'D'. Denormalised from
  -- shown_order so scoring is a comparison, not a computation.
  key_slot    text not null check (key_slot in ('A','B','C','D')),

  -- ── phase 1 ────────────────────────────────────────────────────────
  -- null pick + non-null blind_at means the reviewer answered "can't
  -- tell", which is a real and different answer from "not reviewed yet"
  -- and must not collapse into it.
  blind_pick  text check (blind_pick in ('A','B','C','D')),
  blind_at    timestamptz,

  -- ── phase 2 ────────────────────────────────────────────────────────
  -- unique      the key is the only defensible reply
  -- alternative another option is also defensible — the item is soft
  -- broken     no unique answer, or the key is wrong
  verdict     text check (verdict in ('unique','alternative','broken')),
  -- authentic  reads like a real published item
  -- artificial reads authored to a template
  realism     text check (realism in ('authentic','artificial')),
  note        text,
  reviewed_at timestamptz,

  -- One review per item per reviewer per sitting.
  constraint study_item_reviews_unique unique (item_id, run_id, reviewer_id),

  -- Phase 2 cannot exist without phase 1. Enforced here rather than in
  -- the route so a backfill script cannot create a revealed judgement
  -- with no blind answer behind it.
  constraint study_item_reviews_phase_order check (
    (verdict is null and realism is null and reviewed_at is null)
    or blind_at is not null
  ),
  -- A completed phase 2 is complete: a verdict without a realism call
  -- is half a review and reads as a full one in any count.
  constraint study_item_reviews_phase2_whole check (
    (verdict is null and realism is null and reviewed_at is null)
    or (verdict is not null and realism is not null and reviewed_at is not null)
  )
);

create index if not exists study_item_reviews_run_idx  on public.study_item_reviews(run_id);
create index if not exists study_item_reviews_item_idx on public.study_item_reviews(item_id);

comment on table public.study_item_reviews is
  'Human two-phase item review. Phase 1 is a BLIND pick from shuffled options with no stimulus — the guessability number measured on a person. Phase 2 is the revealed judgement. Rows are created when a sample is drawn (blind_at null = drawn, not yet reviewed) so the denominator is fixed before anyone sees the items.';

comment on column public.study_item_reviews.blind_pick is
  'Phase 1 answer. NULL with blind_at set means "can''t tell" — a real answer. NULL with blind_at null means not yet reviewed. Immutable once blind_at is set (see trigger).';

comment on column public.study_item_reviews.shown_order is
  'The per-reviewer shuffle actually presented. Required to score a blind pick after the fact; re-deriving it from a seed has previously invalidated a whole experiment.';

-- ── The immutability that phase 1 depends on ──────────────────────────
-- Not a convention, not a UI guard, not a comment. If this trigger is
-- ever dropped, every blind number in this table becomes unfalsifiable.
create or replace function public.study_item_reviews_lock_blind()
returns trigger
language plpgsql
as $$
begin
  if old.blind_at is not null then
    if new.blind_pick is distinct from old.blind_pick
       or new.blind_at is distinct from old.blind_at
       or new.shown_order is distinct from old.shown_order
       or new.key_slot is distinct from old.key_slot then
      raise exception
        'study_item_reviews: phase 1 is sealed for review % — blind_pick/blind_at/shown_order/key_slot cannot change once answered.',
        old.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists study_item_reviews_lock_blind_trg on public.study_item_reviews;
create trigger study_item_reviews_lock_blind_trg
  before update on public.study_item_reviews
  for each row execute function public.study_item_reviews_lock_blind();

-- ── Per-run results ───────────────────────────────────────────────────
-- The control is the point. A blind score is meaningless without the
-- best fixed-slot strategy on the SAME sample: if the key sat in slot C
-- nine times out of twelve, "always C" scores 75% having learned
-- nothing, and a reviewer's 75% is then worth exactly zero.
create or replace view public.study_item_review_results as
select
  r.run_id,
  r.reviewer_id,
  b.domain,
  count(*)                                                     as drawn,
  count(*) filter (where r.blind_at is not null)               as blind_answered,
  count(*) filter (where r.blind_pick = r.key_slot)            as blind_correct,
  count(*) filter (where r.blind_at is not null
                     and r.blind_pick is null)                 as blind_cant_tell,
  -- Best fixed-slot control over the answered rows.
  greatest(
    count(*) filter (where r.blind_at is not null and r.key_slot = 'A'),
    count(*) filter (where r.blind_at is not null and r.key_slot = 'B'),
    count(*) filter (where r.blind_at is not null and r.key_slot = 'C'),
    count(*) filter (where r.blind_at is not null and r.key_slot = 'D')
  )                                                            as control_best_slot,
  count(*) filter (where r.reviewed_at is not null)            as reviewed,
  count(*) filter (where r.verdict = 'unique')                 as verdict_unique,
  count(*) filter (where r.verdict = 'alternative')            as verdict_alternative,
  count(*) filter (where r.verdict = 'broken')                 as verdict_broken,
  count(*) filter (where r.realism = 'artificial')             as reads_artificial
from public.study_item_reviews r
join public.study_item_bank b on b.id = r.item_id
group by r.run_id, r.reviewer_id, b.domain;

comment on view public.study_item_review_results is
  'Per run, per reviewer, per cohort. Read blind_correct AGAINST control_best_slot, never on its own — the margin is the measurement and the raw percentage is not. drawn minus reviewed is the sample that was skipped, and it stays visible on purpose.';

do $$
declare
  n int;
  bad boolean;
begin
  if to_regclass('public.study_item_reviews') is null then
    raise exception '075 did not create study_item_reviews.';
  end if;
  select count(*) into n from public.study_item_reviews;
  if n <> 0 then
    raise exception '075 expects an empty table on creation, found % rows.', n;
  end if;

  -- Prove the trigger actually fires, here, at apply time. A sealing
  -- trigger that was never exercised is the same as no trigger, and
  -- this repo has shipped exactly that mistake before.
  insert into public.study_item_reviews
    (item_id, run_id, reviewer_id, shown_order, key_slot, blind_pick, blind_at)
  select b.id, '__migration_selftest__', '00000000-0000-0000-0000-000000000000',
         '["A","B","C","D"]'::jsonb, 'B', 'B', now()
    from public.study_item_bank b limit 1;

  bad := false;
  begin
    update public.study_item_reviews
       set blind_pick = 'C'
     where run_id = '__migration_selftest__';
    bad := true;   -- reached only if the trigger did NOT raise
  exception when others then
    null;          -- expected
  end;

  delete from public.study_item_reviews where run_id = '__migration_selftest__';

  if bad then
    raise exception '075 self-test: phase-1 seal did NOT block an update to blind_pick.';
  end if;
end $$;

commit;


-- ── Verify after applying ─────────────────────────────────────────────
--   select * from study_item_review_results;          -- expect 0 rows
--   -- and confirm the seal by hand on a real row later:
--   --   update study_item_reviews set blind_pick='A' where id='…';
--   -- expect: ERROR  phase 1 is sealed for review …
