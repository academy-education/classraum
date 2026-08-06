-- Record WHO — or what — produced a review.
--
-- ── What happened ────────────────────────────────────────────────────
-- On 2026-08-06 forty reviews were entered on support@classraum.com
-- with ChatGPT doing the answering, in good faith: it is better than a
-- person at picking the intended option out of four.
--
-- That is precisely why it cannot go in the human column. The whole
-- register rests on one asymmetry — `blind` is a model, `human` is not,
-- and WHERE THE TWO DISAGREE THE HUMAN WINS. A model-produced row in
-- the human column makes the two columns one column, and every verdict
-- computed from the pair silently becomes a model agreeing with itself.
--
-- It had already fired: SAT Craft and Structure rendered as
-- "CONFIRMED BROKEN — both instruments agree" (blind 97.4%, "human"
-- 100%), which would have condemned 211 items.
--
-- ── How the data flagged itself ──────────────────────────────────────
-- The forty rows scored 82.5% against 33.3% for the seventy-two before
-- them, and Craft and Structure was 20/20 with the "Can't tell" button
-- never pressed. No human has cleared 55% on this instrument. The
-- boundary the account holder reported lines up exactly with the
-- discontinuity in the data, which is why this migration marks a
-- specific timestamped window rather than trusting a description.
--
-- ── Why a column and not a delete ────────────────────────────────────
-- The rows are not worthless — they are a second model attack, run
-- through the human UI, and the 82.5%/33.3% gap is itself the clearest
-- statement this project has that the two instruments measure
-- different things. Deleting them would destroy that. They are
-- RELABELLED, not removed.
--
-- NOT APPLIED. Shown for review first.

alter table public.study_item_reviews
  add column if not exists reviewer_kind text not null default 'human'
  check (reviewer_kind in ('human', 'model_assisted'));

comment on column public.study_item_reviews.reviewer_kind is
  'Provenance of the blind pick. ONLY reviewer_kind = ''human'' may be '
  'reported in the human column — that column''s entire value is being '
  'independent of a model. ''model_assisted'' rows are kept as data but '
  'must never be aggregated as a human sitting.';

/*
 * The window, not the run name.
 *
 * Marking by run_id would encode my reading of which runs were which.
 * The account holder's statement was "the last 40 questions", and the
 * timestamps confirm the last 40 rows are exactly the two 2026-08-06
 * runs and nothing else. Bounded by time AND account, so a future run
 * by anyone else cannot be swept in by re-running this.
 */
update public.study_item_reviews r
   set reviewer_kind = 'model_assisted'
  from public.users u
 where u.id = r.reviewer_id
   and u.email = 'support@classraum.com'
   and r.blind_at >= timestamptz '2026-08-06 07:00:00+00';

/*
 * The fresh view gains the column so every consumer can filter. It is
 * deliberately NOT filtered here: a view that silently drops rows is
 * how a truncated read becomes a believable number, which this project
 * has already been bitten by twice (PostgREST's 1000-row cap, and a
 * verifier reporting "0 problems" over a truncated bank).
 *
 * Callers filter explicitly, and the test suite pins that they do.
 */
create or replace view public.study_item_reviews_fresh as
select r.*
  from public.study_item_reviews r
  join public.study_item_bank b on b.id = r.item_id
 where r.item_sha is not null
   and r.item_sha = b.content_sha;

comment on view public.study_item_reviews_fresh is
  'Reviews that still describe their item. Carries reviewer_kind — any '
  'consumer reporting a HUMAN number must filter reviewer_kind = ''human''.';

-- ── Self-test, same transaction ──────────────────────────────────────
do $$
declare
  v_marked   int;
  v_human    int;
  v_leaked   int;
begin
  select count(*) into v_marked from public.study_item_reviews
   where reviewer_kind = 'model_assisted';
  if v_marked <> 40 then
    raise exception 'expected exactly 40 model_assisted rows, found %', v_marked;
  end if;

  select count(*) into v_human from public.study_item_reviews
   where reviewer_kind = 'human';
  if v_human <> 72 then
    raise exception 'expected 72 human rows to survive, found %', v_human;
  end if;

  /*
   * The load-bearing assertion: the sitting A3 and B1 both rest on must
   * still be human. If this migration ever swept it up, every downstream
   * decision would be built on a relabelled row.
   */
  select count(*) into v_leaked from public.study_item_reviews
   where run_id = 'choose-a-response-2026-08-05'
     and reviewer_kind <> 'human';
  if v_leaked <> 0 then
    raise exception 'choose-a-response-2026-08-05 was marked assisted — % rows', v_leaked;
  end if;

  raise notice 'self-test passed: 40 marked, 72 human, choose-a-response untouched';
end $$;
