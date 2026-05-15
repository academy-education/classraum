-- 022_add_academy_onboarding.sql
-- Adds the columns the admin → manager onboarding handoff needs.
--
-- Flow:
--   1. Admin creates an academy on /admin/academies. The server generates a
--      cryptographically random `onboarding_token` and a 30-day expiry.
--   2. Admin copies the link `/onboarding/{token}` and sends it to the
--      academy's prospective manager.
--   3. The manager opens the link, sees the academy name, fills in their
--      account credentials + missing academy info, and submits.
--   4. The server creates the user + manager rows, sets
--      `onboarding_completed_at = now()`, and the link is invalidated.
--   5. Any subsequent visit to that token sees an "already completed" page.
--
-- Tokens are stored as plain text (not hashed) — they're single-use, expire,
-- only contain a random ID, and are intended to be transmitted via copy/paste
-- or email. If you ever need to print these in logs, redact them.

BEGIN;

ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS onboarding_token TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Unique constraint on the token. Partial index — only enforce uniqueness
-- when the token isn't NULL (most academies post-onboarding will have NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_academies_onboarding_token_unique
  ON academies(onboarding_token)
  WHERE onboarding_token IS NOT NULL;

COMMIT;
