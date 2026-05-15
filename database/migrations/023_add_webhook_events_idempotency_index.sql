-- Migration 023: Add idempotency index on webhook_events.webhook_id
--
-- The PortOne webhook handlers (src/app/api/webhooks/portone/{settlements,payouts}/route.ts)
-- now capture the `webhook-id` header and store it in webhook_events.webhook_id
-- to support idempotent processing of retried deliveries.
--
-- This partial unique index enforces "at most one webhook_events row per
-- distinct webhook_id" at the database layer, which:
--   1. Closes the race window between the application-level SELECT-then-INSERT
--      idempotency check and the actual write — concurrent retries that both
--      pass the SELECT will see a 23505 unique_violation on the second INSERT.
--   2. Lets the handlers gate side-effecting work (alerts, notifications,
--      future refund/reversal logic) on a successful insert; the duplicate
--      branch returns early and skips those side effects.
--
-- The `WHERE webhook_id IS NOT NULL` clause keeps backfilled rows from before
-- this fix (where webhook_id was always written as NULL) from blocking the
-- index. Once historical rows are backfilled or aged out, this can be tightened
-- to a full unique constraint.

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_webhook_id_unique
  ON webhook_events (webhook_id)
  WHERE webhook_id IS NOT NULL;
