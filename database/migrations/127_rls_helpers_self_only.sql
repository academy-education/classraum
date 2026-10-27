-- 127_rls_helpers_self_only.sql — two RLS helper functions answer only for the caller.
--
-- Found 2026-10-27 by the Supabase security advisor
-- (authenticated_security_definer_function_executable). Both functions are
-- SECURITY DEFINER and EXECUTE-able by `authenticated`, so any signed-in user
-- could call them over PostgREST (/rest/v1/rpc/...) with ANOTHER user's id:
--
--   get_user_family_students(parent_user_id)   -> that parent's children's ids
--   get_user_accessible_classrooms(input_user_id) -> that user's classroom ids
--
-- IDs only, but it maps families and class membership for anyone.
--
-- Every RLS policy that uses them passes the caller's own id
-- (`auth.uid()` or `(SELECT auth.uid())`), so the fix is a guard at the top:
-- when a signed-in user calls with someone else's id, return an empty array.
-- The service role and the postgres owner have no auth.uid() (NULL), so
-- server-side callers are unchanged. EXECUTE stays granted, because the RLS
-- policies are evaluated as the querying role and need it.
--
-- APPLIED 2026-10-27 (apply_migration 127_rls_helpers_self_only). Tested in a
-- rolled-back transaction against the live database before
-- applying: as a parent and as a teacher, the policies return the same rows
-- before and after, a self call returns the same ids, and a call with another
-- user's id returns {}.

CREATE OR REPLACE FUNCTION public.get_user_family_students(parent_user_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  student_ids UUID[];
BEGIN
  -- Self only for signed-in callers (127). NULL auth.uid() = server/service role.
  IF auth.uid() IS NOT NULL AND parent_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT ARRAY_AGG(fm2.user_id)
  INTO student_ids
  FROM family_members fm1
  JOIN family_members fm2 ON fm1.family_id = fm2.family_id
  WHERE fm1.user_id = parent_user_id AND fm1.role = 'parent'
    AND fm2.role = 'student';

  RETURN COALESCE(student_ids, ARRAY[]::UUID[]);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_classrooms(input_user_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  classroom_ids UUID[];
BEGIN
  -- Self only for signed-in callers (127). NULL auth.uid() = server/service role.
  IF auth.uid() IS NOT NULL AND input_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  -- Get user role
  SELECT role INTO user_role FROM users WHERE id = input_user_id;

  IF user_role = 'student' THEN
    -- Students: classrooms they're enrolled in
    SELECT ARRAY_AGG(classroom_id)
    INTO classroom_ids
    FROM classroom_students
    WHERE student_id = input_user_id;

  ELSIF user_role = 'parent' THEN
    -- Parents: classrooms their children are enrolled in
    SELECT ARRAY_AGG(DISTINCT cs.classroom_id)
    INTO classroom_ids
    FROM classroom_students cs
    WHERE cs.student_id = ANY(get_user_family_students(input_user_id));

  ELSIF user_role = 'teacher' THEN
    -- Teachers: classrooms they teach
    SELECT ARRAY_AGG(id)
    INTO classroom_ids
    FROM classrooms
    WHERE teacher_id = input_user_id;

  ELSIF user_role = 'manager' THEN
    -- Managers: all classrooms in their academy
    SELECT ARRAY_AGG(c.id)
    INTO classroom_ids
    FROM classrooms c
    JOIN managers m ON c.academy_id = m.academy_id
    WHERE m.user_id = input_user_id AND m.active = true;

  END IF;

  RETURN COALESCE(classroom_ids, ARRAY[]::UUID[]);
END;
$function$;
