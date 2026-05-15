-- Migration 025: Track when due/overdue reminder pushes were sent for
-- assignments and invoices.
--
-- Two new daily crons send reminder pushes to parents + students:
--   - /api/cron/assignment-reminders : "Assignment due tomorrow" and
--     "Assignment is now overdue"
--   - /api/cron/payment-reminders    : "Payment due soon" and
--     "Payment is now overdue"
--
-- Each event needs its own dedup column so the cron can fire the right
-- reminder once and only once per row, even if the cron retries or
-- preview deploys hit the production endpoint.
--
-- Naming mirrors the `reminder_sent_at` column on classroom_sessions
-- added in migration 024.

-- ─── assignments ─────────────────────────────────────────────────────────
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS due_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_notification_sent_at TIMESTAMPTZ;

-- Partial index for the "due tomorrow" cron — only un-reminded rows,
-- ordered by due_date for the WHERE/ORDER pattern the cron uses.
CREATE INDEX IF NOT EXISTS assignments_pending_due_reminder_idx
  ON assignments (due_date)
  WHERE due_reminder_sent_at IS NULL AND deleted_at IS NULL;

-- Partial index for the "now overdue" cron — un-overdue-notified rows
-- whose due_date has passed are the candidates.
CREATE INDEX IF NOT EXISTS assignments_pending_overdue_idx
  ON assignments (due_date)
  WHERE overdue_notification_sent_at IS NULL AND deleted_at IS NULL;

-- ─── invoices ────────────────────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS due_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_notification_sent_at TIMESTAMPTZ;

-- Note: invoices has no `deleted_at` column (unlike assignments), so the
-- partial-index predicate omits it.
CREATE INDEX IF NOT EXISTS invoices_pending_due_reminder_idx
  ON invoices (due_date)
  WHERE due_reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS invoices_pending_overdue_idx
  ON invoices (due_date)
  WHERE overdue_notification_sent_at IS NULL;
