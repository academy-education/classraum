-- Migration 024: Track when a "tomorrow's session" reminder push was sent.
--
-- The new daily cron at /api/cron/session-reminders fires push notifications
-- to parents + students + teachers about tomorrow's scheduled sessions.
-- Without a per-row marker, cron retries (or accidental double-runs from
-- e.g. Vercel preview deploys hitting the production endpoint) would
-- re-notify everyone.
--
-- The cron filters `WHERE status = 'scheduled' AND date = tomorrow AND
-- reminder_sent_at IS NULL`, then UPDATEs the column after the push.
-- A NULL value means "not yet reminded"; a timestamp means "already
-- reminded (at this time)" — also useful for support debugging when a
-- parent says "I never got the reminder."

ALTER TABLE classroom_sessions
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Partial index keeps the cron's filter fast even as the table grows —
-- only rows that haven't been reminded yet are indexed, which is the
-- exact set the cron scans.
CREATE INDEX IF NOT EXISTS classroom_sessions_pending_reminder_idx
  ON classroom_sessions (date)
  WHERE reminder_sent_at IS NULL AND status = 'scheduled';
