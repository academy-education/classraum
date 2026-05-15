-- 021_add_group_chat_management.sql
-- Adds the columns that group chat management needs:
--   * Avatar (`avatar_url`) on user_conversations
--   * System messages on user_messages (e.g. "Alice added Bob",
--     "Alice renamed the group to ‘Math Team’")
--
-- System messages are stored in `user_messages` so they appear inline in
-- the chat timeline. They use a non-null `system_type` discriminator and a
-- JSONB `system_meta` payload for params (actor / target / old_name / new_name).
-- The `message` text column is nullable now since system messages render
-- entirely from `system_type` + `system_meta` in the client (so the rendered
-- string can be localized at display time).

BEGIN;

-- 1. Group avatar
ALTER TABLE user_conversations
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. System message support
ALTER TABLE user_messages
  ADD COLUMN IF NOT EXISTS system_type TEXT,
  ADD COLUMN IF NOT EXISTS system_meta JSONB;

-- Allow `message` to be NULL for system messages (which render from
-- system_type + system_meta and don't have user-typed text).
ALTER TABLE user_messages
  ALTER COLUMN message DROP NOT NULL;

-- Sanity check: enforce that every row has either a user message or a system
-- type — never both null. This keeps malformed rows out.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_messages_message_or_system_check'
  ) THEN
    ALTER TABLE user_messages
      ADD CONSTRAINT user_messages_message_or_system_check
      CHECK (message IS NOT NULL OR system_type IS NOT NULL);
  END IF;
END $$;

-- Optional index — system messages aren't filtered by type often, but if
-- the chat timeline ever wants to "show all member-add events for this user",
-- this makes it cheap.
CREATE INDEX IF NOT EXISTS idx_user_messages_system_type
  ON user_messages(system_type)
  WHERE system_type IS NOT NULL;

COMMIT;

-- AFTER APPLYING THIS MIGRATION:
-- Create a public storage bucket named `conversation-avatars` in Supabase
-- Studio (Storage → New bucket → name: conversation-avatars, public: yes).
-- The client uploads avatars directly via supabase.storage from the group
-- settings modal.
