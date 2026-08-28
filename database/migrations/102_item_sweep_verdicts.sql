-- 102: study_item_sweep_verdicts — the OPEN read-every-item pass.
--
--
-- WHY THIS IS NOT study_item_reviews
--
-- 075 is a two-phase BLIND sitting: options first, key withheld by the
-- server, immutability enforced by trigger. It measures one thing —
-- whether an item can be answered without its source — on a SAMPLE.
--
-- This table is the opposite instrument on purpose:
--
--   * the key and the rationale are shown from the start. There is
--     nothing to withhold, so none of 075's machinery applies.
--   * the denominator is the WHOLE cohort, not a drawn sample. The
--     question is "has every item been read by a person", which only
--     means anything if unreviewed items stay visibly unreviewed.
--   * verdicts are MUTABLE. A reviewer who flags an item, thinks again
--     and downgrades it to keep is doing the job correctly. 075's rows
--     are frozen because a revised blind pick is worthless; a revised
--     open judgement is just a better judgement.
--
-- Mixing the two in one table would mean one of those rules quietly
-- losing to the other, and the loser would be the blind immutability
-- trigger — the single guarantee here that is load-bearing.
--
--
-- WHY item_sha IS STAMPED ON WRITE
--
-- Same reasoning as 076. A verdict describes the text the reviewer
-- actually read. If an item is edited afterwards the verdict is stale
-- and must stop counting as evidence — but the row is kept, because
-- "this was signed off before it changed" is exactly what you want to
-- see when a defect turns up later.

begin;

create table if not exists public.study_item_sweep_verdicts (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.study_item_bank(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,

  -- keep  — would put it on a real form as-is
  -- flag  — usable after an edit; the note says what
  -- reject— broken; the note says why. This is the one that gets acted on.
  verdict     text not null check (verdict in ('keep', 'flag', 'reject')),

  -- Free text. Required for flag/reject at the API layer, not here: a
  -- CHECK on note length would block the reviewer mid-typing on an
  -- autosave path, which is how you teach someone to stop writing notes.
  note        text,

  -- md5 of the item content as rendered to this reviewer (see 076).
  item_sha    text not null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One standing verdict per person per item. A second pass by the same
  -- reviewer REPLACES their earlier call rather than accumulating; two
  -- different reviewers disagreeing is the signal worth keeping, one
  -- reviewer changing their mind is not.
  unique (item_id, reviewer_id)
);

create index if not exists idx_sweep_verdicts_item     on public.study_item_sweep_verdicts (item_id);
create index if not exists idx_sweep_verdicts_reviewer on public.study_item_sweep_verdicts (reviewer_id);
create index if not exists idx_sweep_verdicts_verdict  on public.study_item_sweep_verdicts (verdict);

create or replace function public.touch_sweep_verdict()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_sweep_verdict on public.study_item_sweep_verdicts;
create trigger trg_touch_sweep_verdict
  before update on public.study_item_sweep_verdicts
  for each row execute function public.touch_sweep_verdict();

-- Service-role only, like the rest of the bank QC surface. Every read and
-- write goes through /api/admin/bank-qc/sweep behind requireAdmin; no
-- anon or authenticated policy is granted, so RLS-on with no policy is
-- the intended deny-all.
alter table public.study_item_sweep_verdicts enable row level security;

-- NO SQL-SIDE FRESHNESS VIEW, DELIBERATELY.
--
-- 076 has one, and the obvious move was to copy it. It would be wrong
-- here: jsonb's text output puts a space after every comma
-- (["a", "b"]) while JSON.stringify does not (["a","b"]), so a hash
-- recomputed in SQL over item->>'choices' can never equal the hash the
-- route wrote. Every verdict would silently read as stale — a check
-- that fails 100% of the time reads exactly like a bank that is 100%
-- edited, and the natural response would have been to stop trusting
-- the freshness column rather than to find the space.
--
-- So the sha is computed in ONE place, sweepSha() in
-- src/lib/study/item-sweep.ts, and freshness is decided in the route.
-- A mirror test pins the two together.

commit;
