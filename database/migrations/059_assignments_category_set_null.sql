-- Academy deletion was deadlocked on cascade ORDER, not on a missing
-- deletion path.
--
-- `delete_academy_cascade()` deletes the academy, which cascades to both
-- `classrooms` and `assignment_categories`. Assignments are already
-- doomed by the first chain:
--
--   assignments.classroom_session_id -> classroom_sessions  CASCADE
--   classroom_sessions.classroom_id  -> classrooms          CASCADE
--   classrooms.academy_id            -> academies           CASCADE
--
-- but `assignments.assignment_categories_id` had NO ACTION, so when the
-- cascade reached a category whose assignments had not yet been removed,
-- Postgres raised a foreign-key violation and the whole delete rolled
-- back. The nightly process-account-deletions cron calls this function,
-- so every academy with assignments silently failed to be erased.
--
-- SET NULL rather than CASCADE, deliberately:
--
--   * The assignments still get deleted — by their own classroom-session
--     cascade. SET NULL only removes the ordering deadlock. CASCADE
--     would add a SECOND deletion path and change unrelated behavior:
--     deleting one category in day-to-day use would silently delete
--     every assignment filed under it.
--   * Uncategorized is already a normal, supported state — 1511 of the
--     existing assignments have a NULL category right now.
--
-- Side benefit: deleting a single assignment category is currently
-- impossible for the same reason. After this it detaches its
-- assignments instead of failing.
begin;

alter table assignments
  drop constraint assignments_assignment_categories_id_fkey;

alter table assignments
  add constraint assignments_assignment_categories_id_fkey
  foreign key (assignment_categories_id)
  references assignment_categories(id)
  on delete set null;

commit;
