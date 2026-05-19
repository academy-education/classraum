-- Migration 026: Account deletion (Phase 1 — schedule + audit).
--
-- Self-service account deletion uses a 30-day soft-delete window. When a
-- user requests deletion:
--   1. `users.deletion_scheduled_at` is set to NOW().
--   2. The auth user is banned via `auth.admin.updateUserById({ banned_until })`.
--   3. A row is inserted into `account_deletion_log` for the audit trail.
--
-- During the 30-day window, the user can reactivate by signing back in via
-- a dedicated reactivation page (which clears both columns).
--
-- A daily cron (`/api/cron/process-account-deletions`, Phase 2) processes
-- rows where `deletion_scheduled_at + 30 days < now()` and runs the hard
-- cascade: deletes role-specific rows, anonymizes retained billing data,
-- removes the users row, and deletes the auth identity.

-- ─── users: track scheduled deletion ─────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

-- Cron will SELECT * FROM users WHERE deletion_scheduled_at + interval '30 days' < now()
-- Partial index keeps it cheap — only the small set of scheduled rows matter.
CREATE INDEX IF NOT EXISTS users_deletion_scheduled_idx
  ON users (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL;

COMMENT ON COLUMN users.deletion_scheduled_at IS
  'When set, the account is scheduled for permanent deletion 30 days later. '
  'Sign-in is blocked via auth.users.banned_until until cleared. '
  'Cleared by /api/account/reactivate.';

-- ─── audit log ───────────────────────────────────────────────────────────
-- Compliance: keep an immutable record of every deletion request, who made
-- it, and when the hard delete actually ran. We retain this row even after
-- the user is gone so support can answer "did so-and-so really delete?".

CREATE TABLE IF NOT EXISTS account_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subject of the deletion. NOT a FK — survives the user row being gone.
  user_id UUID NOT NULL,
  user_email TEXT,
  user_role TEXT,
  user_name TEXT,

  -- Lifecycle timestamps.
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reactivated_at TIMESTAMPTZ,
  hard_deleted_at TIMESTAMPTZ,

  -- Request context (best-effort; from request headers).
  requested_from_ip TEXT,
  requested_user_agent TEXT,

  -- Why the user gave (optional free-text from the modal).
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_deletion_log_user_id_idx
  ON account_deletion_log (user_id);

CREATE INDEX IF NOT EXISTS account_deletion_log_pending_hard_delete_idx
  ON account_deletion_log (scheduled_at)
  WHERE hard_deleted_at IS NULL AND reactivated_at IS NULL;

-- RLS: this is admin-only. Service role bypasses RLS.
ALTER TABLE account_deletion_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin / admin roles can view the audit log via PostgREST.
-- Regular users cannot see their own entries through normal queries —
-- that's fine, the UI doesn't need to surface this.
CREATE POLICY "admins_can_view_account_deletion_log"
  ON account_deletion_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE account_deletion_log IS
  'Audit trail for account deletion requests. Rows persist after the '
  'subject user is hard-deleted so support can verify deletion history. '
  'See Phase 2 migration for cascade details.';
