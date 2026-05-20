-- Migration 029: Audit when an academy's PortOne billing key was cancelled.
--
-- When the Phase 3 academy cascade runs, we now call PortOne's
-- DELETE /billing-keys/{billingKey} BEFORE deleting the
-- academy_subscriptions row. This column records that we did so —
-- useful for support to verify the customer's stored card token is
-- actually gone from PortOne's side (the academy_subscriptions row
-- itself is deleted by the CASCADE on academies, so we lose the
-- record otherwise).
--
-- We don't fail the cascade if the PortOne DELETE call errors out —
-- we log it and continue (the academy must still be deleted), but
-- the next cron run won't re-attempt cancellation since the row is
-- gone. A NULL `billing_key_cancelled_at` after the cron ran tells
-- ops "manual PortOne cleanup may be needed for this billing key".
-- See account_deletion_log.reason for cross-reference.

ALTER TABLE academy_subscriptions
  ADD COLUMN IF NOT EXISTS billing_key_cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN academy_subscriptions.billing_key_cancelled_at IS
  'When set, the underlying PortOne billing key has been explicitly '
  'cancelled (DELETE /billing-keys/{billingKey}). Cleared during '
  'normal subscription lifecycle; populated by the account-deletion '
  'cron when an academy is cascade-deleted.';
