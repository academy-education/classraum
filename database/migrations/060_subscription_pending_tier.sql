-- 060: restore scheduled downgrades
--
-- academy_subscriptions already had pending_change_effective_date (WHEN a
-- scheduled plan change takes effect) but never had the two columns saying
-- WHAT it changes to. No migration ever created them, yet three code paths
-- referenced them, and PostgREST rejects an entire statement that names an
-- unknown column. The result:
--
--   * POST /api/subscription/downgrade always returned 500, so a manager
--     choosing a cheaper plan got a "Downgrade Failed" toast and nothing
--     was ever persisted.
--   * The upgrade path in /api/subscription/subscribe cleared these columns
--     on success, so upgrades failed too — before the charge, so no money
--     moved, but the path was dead.
--   * The billing cron's "apply the scheduled change at renewal" block read
--     pending_tier, so it was permanently unreachable.
--
-- Downgrades are deliberately deferred rather than immediate: the academy
-- has already paid through the end of the current period, so their limits
-- must not drop mid-cycle. The cron applies the change at renewal and
-- charges the new, lower amount.
--
-- Both columns are nullable with no default — NULL means "no change
-- scheduled", which is the correct state for every existing row, so this
-- needs no backfill.

ALTER TABLE public.academy_subscriptions
  ADD COLUMN IF NOT EXISTS pending_tier text,
  ADD COLUMN IF NOT EXISTS pending_monthly_amount numeric;

-- Mirror the plan_tier CHECK so a scheduled change can only ever target a
-- real plan. NOT VALID would be pointless here (no existing rows to
-- violate it), so validate immediately.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.academy_subscriptions'::regclass
      AND conname = 'academy_subscriptions_pending_tier_check'
  ) THEN
    ALTER TABLE public.academy_subscriptions
      ADD CONSTRAINT academy_subscriptions_pending_tier_check
      CHECK (pending_tier IS NULL OR pending_tier IN ('individual', 'basic', 'pro', 'enterprise'));
  END IF;
END $$;

COMMENT ON COLUMN public.academy_subscriptions.pending_tier IS
  'Plan tier this subscription switches to at pending_change_effective_date. NULL = no scheduled change. Set by the downgrade endpoint, applied and cleared by the subscription-billing cron.';
COMMENT ON COLUMN public.academy_subscriptions.pending_monthly_amount IS
  'monthly_amount to charge from pending_change_effective_date onward. NULL = no scheduled change.';

-- The cron scans for due changes by date; keep that cheap and make the
-- partial index self-documenting about what "pending" means.
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_pending_change
  ON public.academy_subscriptions (pending_change_effective_date)
  WHERE pending_tier IS NOT NULL;
