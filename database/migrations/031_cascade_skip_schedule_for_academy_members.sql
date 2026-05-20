-- Migration 031: delete_user_account_cascade now takes a
-- p_skip_schedule_check boolean param.
--
-- The H1/M2 guards (deletion_scheduled_at IS NOT NULL AND >30d elapsed)
-- protect against:
--   - Reactivation race: user clicks Reactivate while cron is mid-loop on
--     them. SELECT ... FOR UPDATE + the new guard close the window.
--   - IDOR / defense-in-depth: any future code path with service-role
--     access that passes an arbitrary user_id would otherwise nuke the
--     user. The function refuses unless the schedule is legitimately past
--     the cutoff.
--
-- But the academy-cascade flow (runAcademyCascade in the cron) has to
-- hard-delete OTHER members of an academy who didn't personally request
-- deletion — their deletion_scheduled_at is NULL but the manager's
-- confirmation IS schedule-gated. The boolean param lets that trusted
-- caller bypass the guard explicitly.

DROP FUNCTION IF EXISTS delete_user_account_cascade(UUID);

CREATE OR REPLACE FUNCTION delete_user_account_cascade(
  p_user_id UUID,
  p_skip_schedule_check BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_scheduled_at TIMESTAMPTZ;
  v_invoices_anonymized INT := 0;
  v_classrooms_unassigned INT := 0;
  v_announcements_unauthored INT := 0;
  v_managed_academies INT := 0;
  v_grace_cutoff TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
  -- Lock the row to close the cascade-vs-reactivate race window.
  SELECT role, deletion_scheduled_at
    INTO v_role, v_scheduled_at
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('status', 'already_deleted');
  END IF;

  IF NOT p_skip_schedule_check THEN
    IF v_scheduled_at IS NULL THEN
      RETURN jsonb_build_object(
        'status', 'not_scheduled',
        'reason', 'deletion_scheduled_at is NULL — user reactivated or never requested deletion'
      );
    END IF;
    IF v_scheduled_at > v_grace_cutoff THEN
      RETURN jsonb_build_object(
        'status', 'not_scheduled',
        'reason', 'grace period not elapsed',
        'scheduled_at', v_scheduled_at,
        'grace_cutoff', v_grace_cutoff
      );
    END IF;
  END IF;

  IF v_role = 'manager' THEN
    SELECT COUNT(*) INTO v_managed_academies
    FROM academies a
    WHERE EXISTS (
      SELECT 1 FROM managers m
      WHERE m.academy_id = a.id AND m.user_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM managers m2
      WHERE m2.academy_id = a.id AND m2.user_id <> p_user_id
    );

    IF v_managed_academies > 0 THEN
      RAISE EXCEPTION 'PHASE_3_REQUIRED'
        USING HINT = 'User is the sole manager of ' || v_managed_academies || ' academy(ies). Academy cascade required.';
    END IF;
  END IF;

  IF v_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'UNSUPPORTED_ROLE'
      USING HINT = 'Self-deletion of admin accounts is not supported through this flow. Use direct database access.';
  END IF;

  IF v_role = 'student' THEN
    UPDATE invoices
    SET invoice_name = '[deleted account]', notes = NULL, student_id = NULL
    WHERE student_id = p_user_id;
    GET DIAGNOSTICS v_invoices_anonymized = ROW_COUNT;
  END IF;

  IF v_role = 'teacher' THEN
    UPDATE classrooms SET teacher_id = NULL WHERE teacher_id = p_user_id;
    GET DIAGNOSTICS v_classrooms_unassigned = ROW_COUNT;
    UPDATE classroom_sessions SET substitute_teacher = NULL WHERE substitute_teacher = p_user_id;
    UPDATE announcements SET created_by = NULL WHERE created_by = p_user_id;
    GET DIAGNOSTICS v_announcements_unauthored = ROW_COUNT;
    UPDATE assignment_attachments SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
    UPDATE student_reports SET created_by = NULL WHERE created_by = p_user_id;
    UPDATE alerts SET acknowledged_by = NULL WHERE acknowledged_by = p_user_id;
    UPDATE chat_conversations SET closed_by = NULL WHERE closed_by = p_user_id;
  END IF;

  IF v_role = 'manager' THEN
    UPDATE announcements SET created_by = NULL WHERE created_by = p_user_id;
    UPDATE assignment_attachments SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
    UPDATE student_reports SET created_by = NULL WHERE created_by = p_user_id;
    UPDATE alerts SET acknowledged_by = NULL WHERE acknowledged_by = p_user_id;
    UPDATE chat_conversations SET closed_by = NULL WHERE closed_by = p_user_id;
  END IF;

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

COMMENT ON FUNCTION delete_user_account_cascade(UUID, BOOLEAN) IS
  'Hard-delete cascade. Refuses to delete users whose deletion request has been cancelled or whose grace period has not elapsed (defense-in-depth against IDOR + reactivation race) unless p_skip_schedule_check=TRUE.';

REVOKE EXECUTE ON FUNCTION delete_user_account_cascade(UUID, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_user_account_cascade(UUID, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION delete_user_account_cascade(UUID, BOOLEAN) FROM anon;
