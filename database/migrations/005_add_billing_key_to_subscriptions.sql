-- Migration: Add billing key support to academy_subscriptions table
-- This enables storing PortOne billing keys for recurring subscription payments

-- Add billing key columns
ALTER TABLE academy_subscriptions
ADD COLUMN IF NOT EXISTS billing_key TEXT,
ADD COLUMN IF NOT EXISTS billing_key_issued_at TIMESTAMPTZ;

-- Add index for faster billing key lookups
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_billing_key
ON academy_subscriptions(billing_key) WHERE billing_key IS NOT NULL;

-- Add index for next_billing_date queries (used by cron job)
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_next_billing
ON academy_subscriptions(next_billing_date, status)
WHERE status = 'active' AND next_billing_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN academy_subscriptions.billing_key IS 'PortOne billing key for recurring payments';
COMMENT ON COLUMN academy_subscriptions.billing_key_issued_at IS 'Timestamp when the billing key was issued';
