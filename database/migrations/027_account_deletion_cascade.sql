-- Migration 027: Account deletion Phase 2 — cascade function + schema relaxations.
--
-- Sets up the actual hard-delete that runs 30 days after a user requests
-- deletion (via /api/cron/process-account-deletions, daily).
--
-- Three pieces:
--   1. Relax NOT NULL on a handful of FK columns so we can SET NULL when
--      the referenced user is gone (preserves dependent records rather than
--      cascade-deleting them).
--   2. Change `invoices.student_record_id` ON DELETE behavior from CASCADE
--      to SET NULL — we want to *retain* invoices for tax/audit even after
--      the student is deleted, with PII anonymized.
--   3. Create the `delete_user_account_cascade(uuid)` plpgsql function that
--      runs the per-role cascade inside an implicit transaction. Phase 3
--      handles sole-manager (academy owner) deletion by RAISE-ing a
--      specific exception code that the cron logs for manual review.

-- ─── (1) NOT NULL relaxations ────────────────────────────────────────────
-- Each of these is referenced via FK with ON DELETE NO ACTION. To delete
-- the user we must either DELETE the dependent row or NULL the column.
-- NULL preserves the dependent record (e.g. a classroom without a teacher
-- is still a valid academy resource that the manager can reassign).

ALTER TABLE invoices ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE classrooms ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE announcements ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE assignment_attachments ALTER COLUMN uploaded_by DROP NOT NULL;

COMMENT ON COLUMN invoices.student_id IS
  'NULL when the student account has been hard-deleted. The invoice row '
  'is retained (anonymized) for tax/audit retention. invoice_name is '
  'overwritten with "[deleted account]" by delete_user_account_cascade().';

COMMENT ON COLUMN classrooms.teacher_id IS
  'NULL when the assigned teacher has been hard-deleted. Academy manager '
  'should reassign via the dashboard.';

COMMENT ON COLUMN announcements.created_by IS
  'NULL when the original author has been hard-deleted. Announcement '
  'content is retained.';

COMMENT ON COLUMN assignment_attachments.uploaded_by IS
  'NULL when the uploader has been hard-deleted. The file is retained.';

-- ─── (2) Change invoices.student_record_id CASCADE → SET NULL ────────────
-- Currently DELETE FROM students CASCADE-deletes the invoice. We want
-- invoices to survive.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_student_record_id_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_student_record_id_fkey
  FOREIGN KEY (student_record_id) REFERENCES students(id) ON DELETE SET NULL;

-- ─── (3) The cascade function ────────────────────────────────────────────
-- Runs role-appropriate cleanup in dependency order. Implicit transaction
-- means either everything succeeds or the function raises and nothing
-- commits — exactly what we want for atomicity.
--
-- Returns: JSON summary of what was affected (counts per relevant table)
-- for the cron to log into account_deletion_log.
--
-- Raises:
--   'USER_NOT_FOUND' when no users row exists for the given id.
--   'PHASE_3_REQUIRED' when role=manager and the user is the sole manager
--     of any academy — that case needs the full academy cascade which is
--     Phase 3 and a separate function with confirmation guards.
--   'UNSUPPORTED_ROLE' for super_admin (admin accounts shouldn't be
--     self-deletable via this flow).

CREATE OR REPLACE FUNCTION delete_user_account_cascade(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_invoices_anonymized INT := 0;
  v_classrooms_unassigned INT := 0;
  v_announcements_unauthored INT := 0;
  v_managed_academies INT := 0;
BEGIN
  -- Look up the user. NOTE: don't lock with FOR UPDATE — Phase 1 already
  -- banned the auth identity, so concurrent writes from this user are not
  -- possible.
  SELECT role INTO v_role FROM users WHERE id = p_user_id;

  IF v_role IS NULL THEN
    -- User already gone — idempotent success. (Possible if cron retries
    -- after the auth.deleteUser succeeded but the audit log update didn't.)
    RETURN jsonb_build_object('status', 'already_deleted');
  END IF;

  -- Phase 3 gate: sole-manager deletion requires the academy cascade.
  IF v_role = 'manager' THEN
    SELECT COUNT(*) INTO v_managed_academies
    FROM academies a
    WHERE EXISTS (
      SELECT 1 FROM managers m
      WHERE m.academy_id = a.id
        AND m.user_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM managers m2
      WHERE m2.academy_id = a.id
        AND m2.user_id <> p_user_id
    );

    IF v_managed_academies > 0 THEN
      RAISE EXCEPTION 'PHASE_3_REQUIRED'
        USING HINT = 'User is the sole manager of ' || v_managed_academies
                  || ' academy(ies). Academy cascade required.';
    END IF;
  END IF;

  IF v_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'UNSUPPORTED_ROLE'
      USING HINT = 'Self-deletion of admin accounts is not supported '
                || 'through this flow. Use direct database access.';
  END IF;

  -- ── STUDENT ──
  -- Anonymize invoices BEFORE deleting the students row (the FK we just
  -- relaxed from CASCADE→SET NULL means invoices survive, but we still
  -- need to scrub the PII fields).
  IF v_role = 'student' THEN
    UPDATE invoices
    SET invoice_name = '[deleted account]',
        notes = NULL,
        student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_invoices_anonymized = ROW_COUNT;
  END IF;

  -- ── TEACHER ──
  -- NULL out the references that would otherwise block the user delete.
  IF v_role = 'teacher' THEN
    UPDATE classrooms SET teacher_id = NULL WHERE teacher_id = p_user_id;
    GET DIAGNOSTICS v_classrooms_unassigned = ROW_COUNT;

    UPDATE classroom_sessions SET substitute_teacher = NULL
    WHERE substitute_teacher = p_user_id;

    UPDATE announcements SET created_by = NULL WHERE created_by = p_user_id;
    GET DIAGNOSTICS v_announcements_unauthored = ROW_COUNT;

    UPDATE assignment_attachments SET uploaded_by = NULL
    WHERE uploaded_by = p_user_id;

    UPDATE student_reports SET created_by = NULL
    WHERE created_by = p_user_id;

    UPDATE alerts SET acknowledged_by = NULL
    WHERE acknowledged_by = p_user_id;

    UPDATE chat_conversations SET closed_by = NULL
    WHERE closed_by = p_user_id;
  END IF;

  -- ── MANAGER (multi-manager case only — sole-manager raised above) ──
  IF v_role = 'manager' THEN
    -- Same NULL-out as teachers since managers can also create
    -- announcements, close chats, etc.
    UPDATE announcements SET created_by = NULL WHERE created_by = p_user_id;
    UPDATE assignment_attachments SET uploaded_by = NULL
    WHERE uploaded_by = p_user_id;
    UPDATE student_reports SET created_by = NULL
    WHERE created_by = p_user_id;
    UPDATE alerts SET acknowledged_by = NULL
    WHERE acknowledged_by = p_user_id;
    UPDATE chat_conversations SET closed_by = NULL
    WHERE closed_by = p_user_id;
  END IF;

  -- ── Delete the users row ──
  -- ON DELETE CASCADE handles: students, parents, teachers, managers,
  -- family_members, notifications, user_preferences, device_tokens,
  -- assignment_comments, comment_reports, conversation_participants,
  -- user_conversations, user_messages, chat_conversations (where
  -- user_id is FK), chat_messages, support_tickets, support_ticket_messages,
  -- system_notifications, academy_notes (admin_user_id),
  -- admin_activity_logs (admin_user_id).
  -- And the role-table CASCADE (students.user_id, etc.) further cascades
  -- to assignment_grades, attendance, classroom_students,
  -- recurring_payment_template_students, student_reports (student_record_id).
  -- (invoices is the exception — student_record_id is SET NULL, student_id
  -- was already NULLed above.)
  DELETE FROM users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'deleted',
    'role', v_role,
    'invoices_anonymized', v_invoices_anonymized,
    'classrooms_unassigned', v_classrooms_unassigned,
    'announcements_unauthored', v_announcements_unauthored
  );
END;
$$;

COMMENT ON FUNCTION delete_user_account_cascade(UUID) IS
  'Phase 2 hard-delete cascade. Called by the daily account-deletion cron '
  '30 days after the user requested deletion. Returns a JSON summary; '
  'raises PHASE_3_REQUIRED for sole-manager accounts and UNSUPPORTED_ROLE '
  'for admin/super_admin.';

-- Lock the function down — service role / cron should be the only caller.
REVOKE EXECUTE ON FUNCTION delete_user_account_cascade(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_user_account_cascade(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION delete_user_account_cascade(UUID) FROM anon;
