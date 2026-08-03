-- 074: study_item_attacks — where blind-attack results actually LIVE.
--
--
-- THE PROBLEM THIS FIXES
--
-- On 2026-08-03 the bank held 3,369 live items, 3,365 of them flagged
-- `verified`, and ZERO rows anywhere recording that ~1,092 of them had
-- been measured as answerable without their own audio or passage. Every
-- attack run to date produced a number that was read once, written into
-- a markdown file or a chat message, and then existed nowhere the
-- application or the next engineer could find it.
--
-- So the bank asserted "verified" for items we knew were broken. Not
-- because anything lied — `verified` means the ANSWER KEY was checked,
-- which is a different and much weaker claim — but because the stronger
-- measurement had no home.
--
-- The cost of that is repeated work: with no record of what was
-- attacked, the only safe assumption is that nothing was, and every
-- question ("is SAT verbal clean?") re-runs from scratch.
--
--
-- WHY A HISTORY TABLE, NOT COLUMNS ON study_item_bank
--
-- An item is attacked more than once — before a repair and after it,
-- and again when the solver pool changes. A `last_attack_score` column
-- answers "how is it now" and destroys "did the repair help", which is
-- the only question that matters when deciding whether to repair the
-- other thousand. Rows are cheap; a lost baseline is not.
--
-- It also keeps the bank table honest: study_item_bank describes the
-- ITEM, this describes a MEASUREMENT of it, and those change for
-- different reasons at different times.
--
--
-- WHAT `correct` MEANS, PRECISELY
--
-- How many of `solvers` independent blind solvers chose the key WITHOUT
-- the source material. `correct = solvers` is the damning case: every
-- solver got it with no audio and no passage. `correct = 0` is the
-- healthy one.
--
-- It is deliberately a COUNT and not a percentage: percentages lose the
-- denominator, and a 100% from one solver is not the 100% from three.

begin;

create table if not exists public.study_item_attacks (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.study_item_bank(id) on delete cascade,
  -- Names the batch, e.g. 'sat-verbal-2026-08-03'. Lets a whole run be
  -- re-read, compared, or thrown away as a unit.
  run_id      text not null,
  solvers     int  not null check (solvers > 0),
  correct     int  not null check (correct >= 0),
  attacked_at timestamptz not null default now(),
  constraint study_item_attacks_correct_le_solvers check (correct <= solvers),
  -- One result per item per run. A re-run under the same id is a
  -- mistake, and re-attacking is what a NEW run_id is for.
  constraint study_item_attacks_unique_per_run unique (item_id, run_id)
);

create index if not exists study_item_attacks_item_idx on public.study_item_attacks(item_id);
create index if not exists study_item_attacks_run_idx  on public.study_item_attacks(run_id);

comment on table public.study_item_attacks is
  'Blind no-source attack results, one row per item per run. THE bank''s record of which items are answerable without their own audio/passage — study_item_bank.verified is a much weaker claim (the answer key was checked) and must never be read as this. correct = how many of `solvers` chose the key with the source withheld; correct = solvers is the damning case.';

comment on column public.study_item_attacks.run_id is
  'Batch name, e.g. sat-verbal-2026-08-03. Re-attacking an item means a NEW run_id — the unique constraint deliberately blocks overwriting a prior measurement, so a before/after repair comparison cannot be destroyed by a re-run.';

-- Coverage, which is the question asked every time: what has NOT been
-- measured? A view rather than a query in a script, so the answer cannot
-- drift between callers.
create or replace view public.study_item_attack_coverage as
select
  b.family,
  b.domain,
  count(*)                                                as items,
  count(a.item_id)                                        as attacked,
  count(*) - count(a.item_id)                             as unmeasured,
  round(100.0 * sum(a.correct) / nullif(sum(a.solvers), 0), 1) as blind_score_pct,
  count(*) filter (where a.correct = a.solvers)           as every_solver_got_it
from public.study_item_bank b
left join lateral (
  -- The most recent run for this item, so a repaired item reports its
  -- post-repair number while its history stays on the table.
  select x.correct, x.solvers, x.item_id
    from public.study_item_attacks x
   where x.item_id = b.id
   order by x.attacked_at desc
   limit 1
) a on true
where not b.archived
group by b.family, b.domain;

comment on view public.study_item_attack_coverage is
  'Per-cohort attack coverage and latest blind score. `unmeasured` is the number to drive work from — an unmeasured cohort is not a clean one.';

do $$
declare n int;
begin
  if to_regclass('public.study_item_attacks') is null then
    raise exception '074 did not create study_item_attacks.';
  end if;
  select count(*) into n from public.study_item_attacks;
  if n <> 0 then
    raise exception '074 expects an empty table on creation, found % rows.', n;
  end if;
  -- The view must answer for EVERY live cohort, or work planned from it
  -- would silently skip one.
  if (select count(*) from public.study_item_attack_coverage) = 0 then
    raise exception 'study_item_attack_coverage returned no cohorts.';
  end if;
end $$;

commit;


-- ── Verify after applying ─────────────────────────────────────────────
--   select * from study_item_attack_coverage order by unmeasured desc;
-- Expect unmeasured = items for every row immediately after apply.
