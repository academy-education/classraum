-- Migration 034: tighten two overly-permissive RLS policies.
--
-- AUDIT FINDING (2026-05-25):
--
-- The pg_policies catalog showed two policies with `USING (true)`:
--
--   1. users.users_read_all
--      Role: public (CRITICAL — includes the anon role used by the
--      browser when not authenticated). Effect: anyone with the
--      publishable Supabase key could `select * from users` and
--      enumerate every user's email, name, role, and
--      deletion_scheduled_at. Catastrophic data leak.
--
--   2. alerts."Authenticated users can read alerts"
--      Role: authenticated. Effect: every signed-in user (any
--      student, parent, teacher) could read every operational
--      alert — payment failures, security incidents, system
--      errors. Lower blast radius than #1 but still info leak.
--
-- This migration is the immediate fix. Follow-up: scope the `users`
-- read further to "users in the same academy as me" via a policy that
-- joins through managers/teachers/students/parents tables. That's a
-- bigger change because it has to keep every legitimate UI read path
-- working (manager rosters, teacher classroom lists, etc.) and is
-- best done with focused testing per-page.

-- ─────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────────────

-- Drop the catastrophic anon-readable policy.
DROP POLICY IF EXISTS users_read_all ON public.users;

-- Replace with an authenticated-only version. Same wide access
-- (intentional — the app relies on cross-user reads for manager
-- rosters etc.) but at minimum requires a valid login.
CREATE POLICY users_read_all_authenticated
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY users_read_all_authenticated ON public.users IS
  'Authenticated users can read user rows. Wide on purpose — tightening '
  'to "users in same academy" is tracked as follow-up (requires '
  'per-UI testing of every cross-user read). Previously had `TO public` '
  'which included anon; this migration closes that hole.';

-- ─────────────────────────────────────────────────────────────────────
-- ALERTS TABLE
-- ─────────────────────────────────────────────────────────────────────

-- Drop the policy that let every authenticated user read all alerts.
DROP POLICY IF EXISTS "Authenticated users can read alerts" ON public.alerts;

-- Replace with admin-only read. Alerts are an operational concept;
-- no student / parent / teacher needs to see them.
CREATE POLICY alerts_admin_read
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON POLICY alerts_admin_read ON public.alerts IS
  'Only admin / super_admin can read operational alerts. Other roles '
  'have no business seeing payment failures, security incidents, etc.';
