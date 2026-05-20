-- Migration 028: Account deletion Phase 3 — academy cascade.
--
-- When the sole manager of an academy is hard-deleted (Phase 2 cron sees
-- PHASE_3_REQUIRED), the entire academy is nuked: all classrooms, sessions,
-- assignments, attendance, families, role rows (teachers/parents/students),
-- co-managers, recurring payments, etc.
--
-- Tax-retained records (subscription_invoices) are anonymized — we relax
-- academy_id to nullable + change the FK to SET NULL, mirroring the
-- invoices.student_record_id pattern from migration 027.
--
-- A separate cron pass then hard-deletes the *users rows* of the now-
-- orphaned former members (they had role rows tied to that academy; with
-- the academy gone and their role row gone, they have no functional
-- account). This avoids leaving members in a broken half-state where they
-- can sign in but get errors on every screen.

-- ─── (1) Relax NOT NULL + change FK on subscription_invoices ─────────────
-- Currently RESTRICT will BLOCK academy delete. Korean tax retention
-- requires these rows survive — same playbook as invoices.student_record_id
-- in migration 027.

ALTER TABLE subscription_invoices ALTER COLUMN academy_id DROP NOT NULL;
ALTER TABLE subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_academy_id_fkey;
ALTER TABLE subscription_invoices
  ADD CONSTRAINT subscription_invoices_academy_id_fkey
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE SET NULL;

COMMENT ON COLUMN subscription_invoices.academy_id IS
  'NULL when the academy has been deleted. The invoice row is retained '
  'for tax/audit. Set by delete_academy_cascade().';

-- ─── (2) The academy cascade function ────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_academy_cascade(p_academy_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academy_name TEXT;
  v_member_user_ids UUID[];
  v_announcement_count INT := 0;
  v_subscription_invoices_anonymized INT := 0;
  v_member_count INT := 0;
BEGIN
  -- Look up the academy. Return idempotent success if already gone.
  SELECT name INTO v_academy_name FROM academies WHERE id = p_academy_id;
  IF v_academy_name IS NULL THEN
    RETURN jsonb_build_object('status', 'already_deleted');
  END IF;

  -- Capture every user_id associated with this academy (students, parents,
  -- teachers, managers). These users will need their accounts cleaned up
  -- separately — the role-table CASCADE will leave them orphaned (users
  -- row + auth identity intact, role row gone) which is a broken state.
  -- We return these IDs so the caller (the cron) can run
  -- delete_user_account_cascade() on each.
  SELECT array_agg(DISTINCT user_id) INTO v_member_user_ids
  FROM (
    SELECT user_id FROM students WHERE academy_id = p_academy_id
    UNION
    SELECT user_id FROM parents WHERE academy_id = p_academy_id
    UNION
    SELECT user_id FROM teachers WHERE academy_id = p_academy_id
    UNION
    SELECT user_id FROM managers WHERE academy_id = p_academy_id
  ) all_members;

  v_member_count := COALESCE(array_length(v_member_user_ids, 1), 0);

  -- Defensive: disable auto_renew on the academy's subscription BEFORE
  -- cascade. If the next subscription-billing cron fires between this
  -- function and the academy DELETE landing, we don't want a stray charge.
  -- (The academy row delete will then CASCADE-delete academy_subscriptions
  -- anyway.)
  UPDATE academy_subscriptions
  SET auto_renew = false, updated_at = NOW()
  WHERE academy_id = p_academy_id;

  -- announcements.academy_id is NO ACTION (NOT NULL). Just delete them —
  -- they're scoped to the academy, no retention required.
  DELETE FROM announcements WHERE academy_id = p_academy_id;
  GET DIAGNOSTICS v_announcement_count = ROW_COUNT;

  -- Anonymize tax-retained subscription_invoices. The FK is now SET NULL
  -- (from the migration above), so the DELETE below will null them
  -- automatically — but explicitly doing it here is clearer and lets us
  -- count for the audit.
  UPDATE subscription_invoices
  SET academy_id = NULL
  WHERE academy_id = p_academy_id;
  GET DIAGNOSTICS v_subscription_invoices_anonymized = ROW_COUNT;

  -- The big one. ON DELETE CASCADE handles ~18 academy-scoped tables:
  -- academy_custom_colors, academy_notes, academy_settings,
  -- academy_subscriptions, assignment_categories, chat_conversations,
  -- classrooms (→ sessions, assignments, attendance, classroom_students),
  -- families (→ family_members), level_tests (→ questions, attempts, etc),
  -- managers, parents, recurring_payment_templates, students, subjects,
  -- subscription_usage, teachers, user_conversations.
  -- support_tickets.academy_id is SET NULL (tickets persist with no
  -- academy reference, which is correct for support history).
  DELETE FROM academies WHERE id = p_academy_id;

  RETURN jsonb_build_object(
    'status', 'deleted',
    'academy_id', p_academy_id,
    'academy_name', v_academy_name,
    'member_user_ids', COALESCE(v_member_user_ids, ARRAY[]::UUID[]),
    'member_count', v_member_count,
    'announcements_deleted', v_announcement_count,
    'subscription_invoices_anonymized', v_subscription_invoices_anonymized
  );
END;
$$;

COMMENT ON FUNCTION delete_academy_cascade(UUID) IS
  'Phase 3 academy cascade. Returns the list of former-member user_ids '
  'so the caller can clean up their now-orphaned users rows. Called by '
  'the daily account-deletion cron when a sole manager hits the grace '
  'period, or by an admin endpoint for manual academy closure.';

REVOKE EXECUTE ON FUNCTION delete_academy_cascade(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_academy_cascade(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION delete_academy_cascade(UUID) FROM anon;

-- ─── (3) Helper: check sole-manager status for a user ────────────────────
-- Called by the eligibility endpoint and by the delete endpoint server-
-- side check. Returns an array of academy_ids the user is the only
-- manager of. Empty array means they're not blocking any academy.

CREATE OR REPLACE FUNCTION user_sole_managed_academies(p_user_id UUID)
RETURNS TABLE (academy_id UUID, academy_name TEXT, member_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS academy_id,
    a.name AS academy_name,
    (
      SELECT COUNT(DISTINCT user_id) FROM (
        SELECT user_id FROM students WHERE academy_id = a.id
        UNION SELECT user_id FROM parents WHERE academy_id = a.id
        UNION SELECT user_id FROM teachers WHERE academy_id = a.id
        UNION SELECT user_id FROM managers WHERE academy_id = a.id
      ) all_members
    ) AS member_count
  FROM academies a
  WHERE EXISTS (
    SELECT 1 FROM managers m
    WHERE m.academy_id = a.id AND m.user_id = p_user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM managers m2
    WHERE m2.academy_id = a.id AND m2.user_id <> p_user_id
  );
$$;

COMMENT ON FUNCTION user_sole_managed_academies(UUID) IS
  'Returns the academies where p_user_id is the sole manager. Used by '
  'the deletion eligibility check.';

REVOKE EXECUTE ON FUNCTION user_sole_managed_academies(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION user_sole_managed_academies(UUID) FROM anon;
-- Allow `authenticated` to call it — the eligibility endpoint uses the
-- user's own session token and the function is read-only.
GRANT EXECUTE ON FUNCTION user_sole_managed_academies(UUID) TO authenticated;
