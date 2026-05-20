-- Migration 032: per-academy email cool-down for academy-closure notices.
-- Security review finding H3 — prevents the "toggle delete/reactivate to
-- spam members" attack from a malicious sole-manager. /api/account/delete
-- checks this column and skips the email blast if the cooldown (7 days)
-- hasn't elapsed.

ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS closure_notice_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN academies.closure_notice_sent_at IS
  'When the most recent academy-closure-notice email blast went out to '
  'members. Used by /api/account/delete to enforce a cool-down preventing '
  'spam from repeated delete/reactivate cycles by a sole-manager.';
