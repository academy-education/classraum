-- 052_notifications_allow_system_and_level_test.sql
--
-- SOURCE OF TRUTH for the legal values of `notifications.type`.
--
-- ---------------------------------------------------------------------
-- WHY THIS FILE EXISTS (read before touching the constraint)
-- ---------------------------------------------------------------------
-- The history of `notifications_type_check` lived ONLY in the live
-- database. Two earlier constraint migrations were applied through the
-- Supabase dashboard and were NEVER committed to database/migrations/:
--
--   * 20250811123823  update_notification_types
--   * 20260722051811  notifications_type_check_add_study_kinds
--
-- Nothing in this repo told a developer which `type` values were legal.
-- Combined with the fact that supabase-js `.insert()` RESOLVES with
-- `{ error }` instead of throwing — so a `try { insert } catch {}` around
-- it catches nothing — four notification kinds shipped with a `type` the
-- constraint rejected and were never delivered once, with zero log output.
--
-- This file is now the authoritative, replayable definition. The two
-- migrations above are NOT reproduced as separate files (their exact
-- historical bodies are unrecoverable); this statement supersedes them
-- and is safe to run on a database in any of those prior states.
--
-- Keep this list in lockstep with `NOTIFICATION_TYPES` in
-- src/lib/notification-types.ts — src/lib/__tests__/notification-types.test.ts
-- parses this file and fails the build if the two drift.
--
-- ALREADY APPLIED to the live project. Idempotent: re-running it just
-- rewrites the same constraint.
-- ---------------------------------------------------------------------

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      -- academy / core product (8)
      'session'::text,
      'attendance'::text,
      'billing'::text,
      'assignment'::text,
      'alert'::text,
      'grade'::text,
      'success'::text,
      'report'::text,
      -- cross-cutting (2)
      'system'::text,
      'level_test'::text,
      -- study domain (12) — mirrors StudyNotificationKind in src/lib/study/notify.ts
      'study_league_promoted'::text,
      'study_league_demoted'::text,
      'study_weekly_recap'::text,
      'study_streak_milestone'::text,
      'study_streak_at_risk'::text,
      'study_streak_saved'::text,
      'study_daily_challenge'::text,
      'study_duel_won'::text,
      'study_duel_lost'::text,
      'study_response_graded'::text,
      'study_payment_failed'::text,
      'study_subscription_expired'::text
    ])
  );

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS
  'Legal notification types. Mirror any change in src/lib/notification-types.ts (NOTIFICATION_TYPES).';
