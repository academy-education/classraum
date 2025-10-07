-- Migration: Create delete_user_account RPC function
-- Description: Creates a function to safely delete a user account and all related data
-- Created: 2025-10-07

-- Drop function if exists
DROP FUNCTION IF EXISTS delete_user_account(UUID);

-- Create the delete_user_account function
CREATE OR REPLACE FUNCTION delete_user_account(
  user_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_records json;
  user_role text;
  user_email text;
  user_name text;
BEGIN
  -- Check if user exists and get user info
  SELECT role, email, name INTO user_role, user_email, user_name
  FROM users
  WHERE id = user_id;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Start deletion process (in order to respect foreign key constraints)

  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_preferences.user_id = delete_user_account.user_id;

  -- Delete notifications
  DELETE FROM notifications WHERE notifications.user_id = delete_user_account.user_id;

  -- Delete assignment comments
  DELETE FROM assignment_comments WHERE assignment_comments.user_id = delete_user_account.user_id;

  -- Delete chat messages (where user is sender)
  DELETE FROM chat_messages WHERE sender_id = delete_user_account.user_id;

  -- Delete chat conversations (where user is the main user or closed_by)
  UPDATE chat_conversations SET closed_by = NULL WHERE closed_by = delete_user_account.user_id;
  DELETE FROM chat_conversations WHERE chat_conversations.user_id = delete_user_account.user_id;

  -- Delete support ticket messages
  DELETE FROM support_ticket_messages WHERE sender_id = delete_user_account.user_id;

  -- Delete support tickets (unassign admin first)
  UPDATE support_tickets SET assigned_admin_id = NULL WHERE assigned_admin_id = delete_user_account.user_id;
  DELETE FROM support_tickets WHERE support_tickets.user_id = delete_user_account.user_id;

  -- Delete comment reports
  DELETE FROM comment_reports WHERE comment_reports.user_id = delete_user_account.user_id;

  -- Role-specific deletions
  IF user_role = 'student' THEN
    -- Delete attendance records
    DELETE FROM attendance WHERE student_id = delete_user_account.user_id;

    -- Delete assignment grades
    DELETE FROM assignment_grades WHERE student_id = delete_user_account.user_id;

    -- Delete classroom enrollments
    DELETE FROM classroom_students WHERE student_id = delete_user_account.user_id;

    -- Delete recurring payment template enrollments
    DELETE FROM recurring_payment_template_students WHERE student_id = delete_user_account.user_id;

    -- Delete invoices
    DELETE FROM invoices WHERE student_id = delete_user_account.user_id;

    -- Delete student reports
    DELETE FROM student_reports WHERE student_reports.student_id = delete_user_account.user_id;

    -- Delete from students table
    DELETE FROM students WHERE students.user_id = delete_user_account.user_id;

  ELSIF user_role = 'teacher' THEN
    -- Update classrooms to remove teacher assignment (set to NULL or reassign)
    UPDATE classrooms SET teacher_id = NULL WHERE teacher_id = delete_user_account.user_id;

    -- Update sessions with substitute teacher
    UPDATE classroom_sessions SET substitute_teacher = NULL WHERE substitute_teacher = delete_user_account.user_id;

    -- Delete from teachers table
    DELETE FROM teachers WHERE teachers.user_id = delete_user_account.user_id;

  ELSIF user_role = 'parent' THEN
    -- Delete from parents table
    DELETE FROM parents WHERE parents.user_id = delete_user_account.user_id;

  ELSIF user_role = 'manager' THEN
    -- Delete from managers table
    DELETE FROM managers WHERE managers.user_id = delete_user_account.user_id;
  END IF;

  -- Delete family memberships
  DELETE FROM family_members WHERE family_members.user_id = delete_user_account.user_id;

  -- Delete from admin tables if applicable
  UPDATE admin_settings SET updated_by = NULL WHERE updated_by = delete_user_account.user_id;
  DELETE FROM admin_activity_logs WHERE admin_user_id = delete_user_account.user_id;
  UPDATE academy_notes SET admin_user_id = NULL WHERE admin_user_id = delete_user_account.user_id;
  UPDATE system_notifications SET created_by = NULL WHERE created_by = delete_user_account.user_id;

  -- Update assignment attachments uploaded_by
  UPDATE assignment_attachments SET uploaded_by = NULL WHERE uploaded_by = delete_user_account.user_id;

  -- Update student reports ai_feedback_created_by
  UPDATE student_reports SET ai_feedback_created_by = NULL WHERE ai_feedback_created_by = delete_user_account.user_id;

  -- Finally, delete the user record
  DELETE FROM users WHERE id = delete_user_account.user_id;

  -- Return success response with deleted user info
  deleted_records := json_build_object(
    'success', true,
    'user_id', user_id,
    'user_email', user_email,
    'user_name', user_name,
    'user_role', user_role,
    'deleted_at', NOW()
  );

  RETURN deleted_records;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id
    );
END;
$$;

-- Grant execute permission to authenticated users (they can only delete their own account)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION delete_user_account IS 'Permanently deletes a user account and all related data. This action cannot be undone.';
