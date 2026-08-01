-- Bank QC ledger — the durable record of how every batch of items was made
-- and checked, and the thing insert consults before allowing anything in.
--
-- NOT APPLIED. Review before running.
--
-- Why: as of 2026-08-01 the only gates between an authored item and
-- study_item_bank were four checks inside insertListening() — JSON shape,
-- explanation-order safety, group size, and "the id appears in a hand-written
-- keep file". No record survived of what else was run, by whom, or with what
-- result. An audit then found every verbal task type 92.7-100% solvable with
-- the source hidden, and none of the QC that had supposedly happened could be
-- reconstructed.
--
-- Pairs with src/lib/study/bank-qc.ts, which holds the pass logic and its
-- tests. This migration only stores what that logic reads.

-- One row per authored batch.
create table if not exists study_bank_batches (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  target_test   text not null,             -- 'toefl' | 'sat'
  section       text not null,             -- 'listening' | 'reading' | 'math' | ...
  task          text not null,             -- the field the DRAW reads: listeningTask /
                                           -- readingTask, or item.type for the types
                                           -- carrying neither. NEVER the domain column.
  family        text not null
    check (family in ('mc_hidden_source','mc_stem_source','cloze','production')),

  -- What was commissioned: item count, difficulty mix (READ from the bank,
  -- not chosen), emphases and the per-emphasis cap. Stored so a later reader
  -- can tell whether the batch met its own spec.
  spec          jsonb not null default '{}'::jsonb,

  -- sha256 of the authored item file, hex. THE load-bearing column: every QC
  -- run is bound to the exact content it judged, so editing an item after
  -- review invalidates its passes instead of silently keeping them.
  content_sha   text not null check (content_sha ~ '^[0-9a-f]{64}$'),

  status        text not null default 'authoring'
    check (status in ('authoring','qc','passed','failed','inserted','abandoned')),

  -- Set when the batch reaches the bank; joins to study_item_bank.cohort so
  -- any live item can be traced back to the QC that admitted it.
  cohort        text,
  notes         text
);

create index if not exists idx_bank_batches_status on study_bank_batches (status, created_at desc);
create index if not exists idx_bank_batches_cohort on study_bank_batches (cohort) where cohort is not null;

-- One row per gate execution. Append-only in practice: a re-run after a fix
-- inserts a new row rather than updating, so the history of what failed and
-- what was changed stays legible.
create table if not exists study_bank_qc_runs (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references study_bank_batches(id) on delete cascade,

  stage        text not null
    check (stage in ('shape','withsource','nosource','elimination','tells')),

  -- The content this run actually judged. If it differs from the batch's
  -- current content_sha the run is STALE and counts for nothing — that is
  -- the "edited after approval" case a keep-list of ids cannot express.
  content_sha  text not null check (content_sha ~ '^[0-9a-f]{64}$'),

  passed       boolean not null,

  -- The measurements behind the verdict — mean accuracy, the cohort's own
  -- fixed-letter control, the margin, per-solver pick spreads, difficulty
  -- distribution. Stored so a reader can re-derive the verdict rather than
  -- trust it, and so thresholds can be re-evaluated later without re-running.
  metrics      jsonb not null default '{}'::jsonb,

  -- Who/what ran it: model, agent count, script version.
  runner       jsonb not null default '{}'::jsonb,
  ran_at       timestamptz not null default now()
);

create index if not exists idx_qc_runs_batch on study_bank_qc_runs (batch_id, stage, ran_at desc);
create index if not exists idx_qc_runs_sha   on study_bank_qc_runs (content_sha);

-- Convenience view for the admin surface: latest run per (batch, stage) at
-- the batch's CURRENT hash. Stages missing from this view are either never
-- run or stale — both block insert, and bank-qc.ts distinguishes them.
create or replace view study_bank_qc_current as
select distinct on (r.batch_id, r.stage)
  r.batch_id, r.stage, r.passed, r.metrics, r.ran_at, r.content_sha
from study_bank_qc_runs r
join study_bank_batches b on b.id = r.batch_id
where r.content_sha = b.content_sha
order by r.batch_id, r.stage, r.ran_at desc;

-- Both tables are internal tooling. No student ever reads them, and their
-- contents (answer keys, solver results) would be actively harmful to leak.
alter table study_bank_batches enable row level security;
alter table study_bank_qc_runs enable row level security;

-- Deliberately no permissive policy: with RLS on and no policy, anon and
-- authenticated clients see nothing. The scripts and any admin route use the
-- service role, which bypasses RLS. If an admin UI later needs direct client
-- reads, add an explicit policy keyed to the admin role then — do not widen
-- this now on the assumption it will be needed.
