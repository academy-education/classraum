-- 083: Camp P3 — in-class review sets share the camp_assignments table.
--
-- A review set is a teacher-facing PRESENT deck (question → reveal) drawn
-- from the same program quota as a student assignment, so it reuses the
-- same row shape (item_ids, section/domain, question_count, quota charge).
-- The `kind` column is the discriminator that keeps review sets OFF the
-- student shelf and OUT of the progress dashboard:
--   * 'assignment' (default) — delivered to students, P1 behaviour
--   * 'review'               — teacher-only presenter deck (P3)
--
-- ADD COLUMN ... DEFAULT backfills existing rows with 'assignment', so
-- every P1 row keeps its meaning without an UPDATE.

alter table camp_assignments
  add column if not exists kind text default 'assignment'
    check (kind in ('assignment', 'review'));

-- Readers filter with `kind is distinct from 'review'` semantics
-- (or(kind.neq.review,kind.is.null) in PostgREST) so a hand-inserted
-- NULL can never leak a review set to students.
