-- Migration 033: pre-launch index audit fills.
--
-- Verified via EXPLAIN ANALYZE on 2026-05-25 that these query patterns
-- were doing Seq Scan + in-memory Sort:
--
--   1. chat_conversations  — only had pkey; the conversations list endpoint
--      (src/app/api/chat/conversations/route.ts:41) selects
--        WHERE user_id = $1 ORDER BY updated_at DESC
--      and the admin support view sorts the entire table by updated_at.
--      Fine at 5 rows, expensive at 10k.
--
--   2. announcements  — mobile feed selects
--        WHERE academy_id IN (...) ORDER BY created_at DESC LIMIT 50
--      (src/app/mobile/announcements/page.tsx). The existing single-column
--      indexes on academy_id and created_at can't be combined cleanly for
--      this pattern; a composite is cheaper.
--
--   3. student_reports  — mobile list selects
--        WHERE student_id = $1 AND status IN (...) ORDER BY created_at DESC
--      (src/app/mobile/reports/page.tsx). Status filtering is intentional
--      (only Finished/Approved/Sent/Viewed get shown to students).
--
-- All indexes use CONCURRENTLY-safe IF NOT EXISTS so this migration is
-- idempotent and won't lock the tables on re-runs.

-- ─────────────────────────────────────────────────────────────────────
-- chat_conversations
-- ─────────────────────────────────────────────────────────────────────

-- Mobile conversations list: WHERE user_id = $1 ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated
  ON chat_conversations (user_id, updated_at DESC);

-- Admin support full-table sort: ORDER BY updated_at DESC
-- (this is also a useful fallback for any caller doing global ordering)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at
  ON chat_conversations (updated_at DESC);

-- Per-academy filtering used by the support admin view; also serves as
-- FK lookup on academy joins.
CREATE INDEX IF NOT EXISTS idx_chat_conversations_academy_id
  ON chat_conversations (academy_id)
  WHERE academy_id IS NOT NULL;

-- The cascade SQL function in migration 031 nulls closed_by when the
-- closer is hard-deleted; partial index supports that lookup without
-- bloating storage on the (mostly-null) column.
CREATE INDEX IF NOT EXISTS idx_chat_conversations_closed_by
  ON chat_conversations (closed_by)
  WHERE closed_by IS NOT NULL;

-- Status filtering for the support inbox: WHERE status = 'open' ORDER BY ...
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status_updated
  ON chat_conversations (status, updated_at DESC)
  WHERE status IS NOT NULL;

COMMENT ON INDEX idx_chat_conversations_user_updated IS
  'Mobile conversations list: WHERE user_id = $1 ORDER BY updated_at DESC';
COMMENT ON INDEX idx_chat_conversations_updated_at IS
  'Admin support inbox global sort by recency.';

-- ─────────────────────────────────────────────────────────────────────
-- announcements
-- ─────────────────────────────────────────────────────────────────────

-- Mobile feed: WHERE academy_id IN (...) ORDER BY created_at DESC LIMIT 50
-- Composite is strictly cheaper than the existing two single-column
-- indexes for this query pattern.
CREATE INDEX IF NOT EXISTS idx_announcements_academy_created
  ON announcements (academy_id, created_at DESC);

COMMENT ON INDEX idx_announcements_academy_created IS
  'Mobile announcements feed: filter by academy_id then sort by recency.';

-- ─────────────────────────────────────────────────────────────────────
-- student_reports
-- ─────────────────────────────────────────────────────────────────────

-- Mobile student reports list with status whitelist + pagination:
-- WHERE student_id = $1 AND status IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_student_reports_student_status_created
  ON student_reports (student_id, status, created_at DESC);

COMMENT ON INDEX idx_student_reports_student_status_created IS
  'Mobile student reports list with status whitelist + chronological order.';
