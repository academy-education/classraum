-- 019_add_group_chat_support.sql
-- Adds many-to-many participant support to user_conversations so the same
-- conversation primitive can host either a 1:1 DM or a group chat.
--
-- Rollout plan:
--   1. Create the join table + new columns (additive, non-breaking).
--   2. Backfill 1:1 conversations into the join table.
--   3. The API/UI start reading via the join table; existing rows still work
--      because their data is duplicated in both places during the transition.
--   4. (Future migration, not in this file) Drop participant_1_id /
--      participant_2_id once we're confident nothing reads them anymore.

BEGIN;

-- 1. Add group metadata to user_conversations.
ALTER TABLE user_conversations
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Many-to-many join table.
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES user_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user
  ON conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_conv_participants_conv
  ON conversation_participants(conversation_id);

-- 3. Backfill existing 1:1 conversations.
--    INSERT ON CONFLICT DO NOTHING makes this idempotent — re-running the
--    migration won't double-insert.
INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
SELECT id, participant_1_id, created_at FROM user_conversations
WHERE participant_1_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
SELECT id, participant_2_id, created_at FROM user_conversations
WHERE participant_2_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 4. RLS — participants can read their own membership, see the conversation
--    metadata, and read messages in conversations they belong to.
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_read_own_membership"
  ON conversation_participants;
CREATE POLICY "participants_read_own_membership"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    -- A user can see participant rows for any conversation they themselves
    -- are a member of (so the UI can render member lists).
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "participants_insert_via_service_role"
  ON conversation_participants;
CREATE POLICY "participants_insert_via_service_role"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
-- Inserts go through the service-role API route, never directly from the
-- client. The WITH CHECK (false) blocks direct writes from authenticated
-- users while still letting the service role bypass RLS.

COMMIT;
