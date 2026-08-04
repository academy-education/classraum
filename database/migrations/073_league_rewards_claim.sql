-- 073: study_league_rewards.claimed_at — click-to-collect league rewards.
--
-- Weekly rewards used to land in the student's credit balance silently,
-- inside the Sunday cron. Now the cron RECORDS the reward and the
-- student COLLECTS it: same amounts, but the payout becomes a moment
-- they see instead of a number that changed while they were asleep.
--
--
-- THE BACKFILL IS THE DANGEROUS PART, NOT THE COLUMN
--
-- Every row already in this table was ALREADY PAID by the old
-- auto-grant path — at the time of writing, 8 rows totalling 16 credits
-- across 2 students. Add a nullable `claimed_at` and leave it NULL and
-- every one of those rows becomes claimable, so those students can
-- collect credits they are already holding. The UPDATE below is
-- therefore not bookkeeping tidiness; it is the difference between
-- 0 and 16 credits of duplicate money, and it scales with however many
-- rows exist when this actually runs.
--
-- `claimed_at = created_at` rather than now(): the reward WAS collected,
-- at the moment the cron granted it. Stamping now() would claim every
-- historical reward was collected on deploy day.
--
--
-- WHY A TIMESTAMP AND NOT A BOOLEAN
--
-- `claimed boolean default false` answers "has it been collected" and
-- nothing else. The timestamp additionally answers "how long do rewards
-- sit uncollected", which is the question that tells you whether the
-- collect step is a delight or an obstacle — the entire reason for this
-- change. It also makes the backfill above self-documenting: a row
-- claimed at exactly its created_at is visibly one the cron paid.
--
--
-- THE UNIQUENESS THAT MAKES THE CLAIM SAFE ALREADY EXISTS
--
-- Double-collecting is prevented in the ENDPOINT, by an
--   update ... set claimed_at = now() where id = $1 and claimed_at is null
--   returning credits
-- whose returned row count is the sole authority on whether to grant.
-- Two concurrent taps both run that UPDATE; Postgres serialises them on
-- the row, the second sees claimed_at already set, matches nothing, and
-- returns zero rows. No credits are granted twice. This migration does
-- not need a constraint for that — it needs the column to start NULL
-- for genuinely new rewards, and NOT NULL for every already-paid one.

begin;

create temporary table _073_before on commit drop as
  select count(*) as n, coalesce(sum(credits), 0) as credits
    from public.study_league_rewards;

alter table public.study_league_rewards
  add column if not exists claimed_at timestamptz;

-- See the header. Every pre-existing row was paid by the old path.
update public.study_league_rewards
   set claimed_at = created_at
 where claimed_at is null;

comment on column public.study_league_rewards.claimed_at is
  'When the student COLLECTED this reward, or NULL if it is still waiting. The credits are granted at collect time, not when the row is written — the Sunday cron records, /api/study/league/claim pays. Rows created before 073 were auto-paid and are backfilled to created_at. The anti-double-collect guarantee lives in the claim endpoint''s conditional UPDATE (where claimed_at is null), not in a constraint here.';

-- ── Assertions ────────────────────────────────────────────────────────
do $$
declare
  before_n bigint; before_credits bigint;
  after_n bigint; after_credits bigint;
  unclaimed int; defaulted text;
begin
  select n, credits into before_n, before_credits from _073_before;
  select count(*), coalesce(sum(credits), 0) into after_n, after_credits
    from public.study_league_rewards;

  if before_n <> after_n or before_credits <> after_credits then
    raise exception
      '073 changed the reward ledger (% rows/% credits -> % rows/% credits). It must only add a column.',
      before_n, before_credits, after_n, after_credits;
  end if;

  -- THE ONE THAT MATTERS. Any row left unclaimed here is a
  -- previously-paid reward that a student could now collect a second
  -- time, so this aborts rather than shipping duplicate credits.
  select count(*) into unclaimed
    from public.study_league_rewards where claimed_at is null;
  if unclaimed > 0 then
    raise exception
      '% pre-existing reward row(s) are still unclaimed. Those were already paid by the pre-073 auto-grant; leaving them NULL would let them be collected again.',
      unclaimed;
  end if;

  select column_default into defaulted
    from information_schema.columns
   where table_schema = 'public' and table_name = 'study_league_rewards'
     and column_name = 'claimed_at';
  if not found then
    raise exception '073 did not create study_league_rewards.claimed_at.';
  end if;
  if defaulted is not null then
    raise exception
      'claimed_at has DEFAULT % — a new reward must start NULL, or it would be born already collected and never pay out.',
      defaulted;
  end if;
end $$;

commit;


-- ── Verify after applying ─────────────────────────────────────────────
-- Expect unclaimed = 0 immediately after apply, and rising only as the
-- Sunday cron writes new rewards.
--
--   select count(*) filter (where claimed_at is null) as waiting,
--          count(*) filter (where claimed_at is not null) as collected
--     from public.study_league_rewards;
--
-- How long rewards sit before collection — the question this column
-- exists to answer:
--
--   select avg(claimed_at - created_at) as mean_wait
--     from public.study_league_rewards
--    where claimed_at is not null and claimed_at > created_at;
