-- 080 · Per-category push notification preferences
--
-- WHY
-- ---
-- `user_preferences.push_notifications` (boolean) is written by the
-- profile toggle and read by NOBODY on the send path. sendPushToStudent
-- selects device_tokens and sends; it never looks at the preference. So a
-- student who switches notifications off still receives them. As of
-- 2026-08-11 that is 1 user of 420 — but it is the one user who
-- explicitly asked not to be notified.
--
-- Fixing only the boolean would leave a second problem: 12 distinct
-- notification kinds behind one switch. A student who wants "your test
-- was graded" but not "your friend beat you" has no way to say so, and
-- the all-or-nothing choice pushes people to mute everything.
--
-- SHAPE
-- -----
-- `push_notifications` (boolean) is KEPT as the master switch, so the
-- existing UI and the 420 existing rows keep working unchanged. The new
-- jsonb adds category granularity underneath it.
--
-- Categories deliberately number four, not twelve — a settings screen
-- with twelve switches is one nobody reads:
--
--   reminders  study_streak_at_risk, study_streak_saved,
--              study_streak_milestone, study_daily_challenge
--   progress   study_response_graded, study_weekly_recap
--   social     study_league_promoted, study_league_demoted,
--              study_duel_won, study_duel_lost
--   account    study_payment_failed, study_subscription_expired
--
-- ACCOUNT IS NOT IN THE COLUMN, ON PURPOSE. "Your payment failed" and
-- "your subscription expired" are service messages a paying customer
-- needs; silently suppressing them because a toggle was flipped months
-- ago turns a settings choice into a billing surprise. The application
-- treats account as always-on and the column has no key for it, so
-- nobody can turn it off by writing JSON directly either.
--
-- FAIL OPEN — THE LOAD-BEARING PART
-- ---------------------------------
-- DEFAULT is an EMPTY object, and the reader treats a missing key as
-- ENABLED. It does not default to '{"reminders":true,...}' because then
-- a key added later would read as "off" for every existing row.
--
-- The dangerous direction here is silence: reading absent-or-unknown as
-- "opted out" would mute all 420 users the moment this deploys, and
-- nobody reports the notifications they did not receive. The email
-- opt-out (lib/study/emailPrefs.ts) already works this way for the same
-- reason; this matches it deliberately.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS push_categories jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_preferences.push_categories IS
  'Per-category push opt-outs: {"reminders":false,"progress":true,"social":false}. '
  'A MISSING key means ENABLED — never treat absent as opted-out, or a newly '
  'added category silently mutes every existing user. Gated by the '
  'push_notifications boolean above it (master off = nothing sends). '
  'The "account" category is intentionally absent and cannot be disabled: '
  'payment-failed and subscription-expired are service messages. '
  'Read by lib/study/push-categories.ts.';

-- Only accept the keys the app knows about, and only booleans. Without
-- this a typo'd key ("remindars": false) is accepted silently and reads
-- as enabled forever — the setting appears to save and does nothing,
-- which is the exact class of bug this migration exists to fix.
ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_push_categories_keys;

-- NO SUBQUERY. The first draft of this used
--   NOT EXISTS (SELECT 1 FROM jsonb_each(push_categories) ...)
-- which Postgres rejects outright: "cannot use subquery in check
-- constraint" (0A000). It had been reviewed and described as ready
-- while being SQL that could never run — a reminder that reading a
-- migration is not the same as executing it.
--
-- The set-difference form is equivalent and subquery-free: deleting the
-- three known keys must leave nothing behind, and no value may be
-- anything but a boolean (jsonpath, so it is safe on any jsonb).
--
-- CASE rather than AND: a CHECK is not guaranteed to evaluate its
-- conjuncts left to right, and `jsonb - text[]` RAISES on a non-object
-- instead of returning false. CASE makes the object test a real guard.
--
-- Verified against 12 cases before being applied — including
-- {"account":false} (rejected: account must not be disablable),
-- {"reminders":null} (rejected: null is not a boolean), and a bare
-- array (rejected without raising).
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_push_categories_keys CHECK (
    CASE WHEN jsonb_typeof(push_categories) = 'object'
         THEN push_categories - ARRAY['reminders', 'progress', 'social'] = '{}'::jsonb
              AND NOT jsonb_path_exists(push_categories, '$.* ? (@.type() != "boolean")')
         ELSE false END
  );

-- No backfill. Every existing row keeps '{}', which reads as all
-- categories enabled — identical to today's behaviour, so this migration
-- changes nobody's notifications on its own. The behaviour change ships
-- with the application gate, where it can be tested and reverted.
