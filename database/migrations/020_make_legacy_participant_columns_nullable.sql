-- 020_make_legacy_participant_columns_nullable.sql
-- Follow-up to 019. The legacy `participant_1_id` / `participant_2_id`
-- columns on `user_conversations` were NOT NULL — that worked when every
-- conversation was strictly 1:1, but group chats can't populate them, so
-- the insert fails with a constraint violation.
--
-- We keep the columns themselves (still populated for 1:1 DMs so any code
-- that still reads them keeps working). A future migration can drop them
-- entirely once nothing reads them anymore.

BEGIN;

ALTER TABLE user_conversations
  ALTER COLUMN participant_1_id DROP NOT NULL,
  ALTER COLUMN participant_2_id DROP NOT NULL;

COMMIT;
