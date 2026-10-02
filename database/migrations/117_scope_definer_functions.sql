-- 117_scope_definer_functions.sql
-- APPLIED 2026-10-02 after a rolled-back before/after matrix (legit callers unchanged, outsiders 0/denied), re-verified live.
-- Review: .tmp-artifacts/definer-functions-review-2026-10-02.md
--
-- 50 SECURITY DEFINER functions in public were EXECUTE-able by `authenticated`
-- (any signed-in user, including a self-signed-up student). 112/113 closed
-- anon; 119 closed self-service role escalation on users.role. This migration:
--
--   A. Academy membership without consent
--      - complete_user_registration(): no caller in src/. Inserted a
--        managers/teachers row for ANY academy, bypassing managers_self_insert
--        (demonstrated: a manager-role account became active manager of an
--        academy that already had one). REVOKE.
--      - handle_new_user(): the sign-up trigger created a managers row for any
--        academy_id in user metadata. Now only when the academy has no active
--        manager, mirroring managers_self_insert (migration 103). The teacher
--        branch is left as is: teacher invite links are /auth?role=teacher&
--        academy_id=... and this branch is what makes them work, so closing it
--        is an owner decision (see review doc).
--   B. REVOKE from authenticated on definer functions that nothing in the
--      browser calls and no RLS policy uses. service_role keeps EXECUTE.
--   C. Caller checks on the definer functions the browser does call.
--
-- Guards treat auth.uid() IS NULL as a trusted caller: anon holds no EXECUTE on
-- any of these (verified 2026-10-02), so a NULL uid means service_role/postgres.


-- ---------------------------------------------------------------------------
-- 0. Helpers (scoped to the caller; safe to grant to authenticated)
-- ---------------------------------------------------------------------------

-- Caller is an active manager or active teacher of the academy.
CREATE OR REPLACE FUNCTION public.app_is_staff_of(a uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.managers where academy_id = a and user_id = auth.uid() and active is true)
      or exists (select 1 from public.teachers where academy_id = a and user_id = auth.uid() and active is true)
$$;

-- Caller may see this student's records: trusted caller, self, a parent in the
-- same family, or staff of an academy the student belongs to.
CREATE OR REPLACE FUNCTION public.app_can_view_student(sid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select auth.uid() is null
      or sid = auth.uid()
      or sid = any (public.get_user_family_students(auth.uid()))
      or exists (select 1 from public.students s
                 where s.user_id = sid and public.app_is_staff_of(s.academy_id))
$$;

-- Caller may see this classroom: trusted caller, the role-based classroom list
-- (same rule get_assignments_for_sessions already uses), or membership of the
-- classroom's academy.
CREATE OR REPLACE FUNCTION public.app_can_see_classroom(cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select auth.uid() is null
      or cid = any (public.get_user_accessible_classrooms(auth.uid()))
      or exists (select 1 from public.classrooms c
                 where c.id = cid and c.academy_id in (select public.caller_academy_ids()))
$$;

REVOKE ALL ON FUNCTION public.app_is_staff_of(uuid), public.app_can_view_student(uuid),
                       public.app_can_see_classroom(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_is_staff_of(uuid), public.app_can_view_student(uuid),
                          public.app_can_see_classroom(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A. Academy membership without consent
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.complete_user_registration(uuid, text, text) FROM authenticated;

-- Identical to the live definition except the 'manager' branch.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  academy_id_param UUID;
  family_id_param UUID;
  user_exists BOOLEAN;
  v_family TEXT;
  v_given  TEXT;
  v_name   TEXT;
  v_email  TEXT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
  IF user_exists THEN
    RETURN NEW;
  END IF;

  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  v_family := NULLIF(btrim(NEW.raw_user_meta_data->>'family_name'), '');
  v_given  := NULLIF(btrim(NEW.raw_user_meta_data->>'given_name'), '');
  v_name   := NULLIF(btrim(NEW.raw_user_meta_data->>'name'), '');

  IF v_family IS NOT NULL AND v_given IS NOT NULL THEN
    IF v_family ~ '[가-힣]' THEN
      v_name := v_family || v_given;
    ELSE
      v_name := v_given || ' ' || v_family;
    END IF;
  ELSE
    v_family := NULL;
    v_given  := NULL;
  END IF;

  v_email := COALESCE(NULLIF(btrim(NEW.email), ''), NEW.id::text || '@no-email.invalid');
  v_name  := COALESCE(v_name, NULLIF(btrim(NEW.email), ''), 'User');

  INSERT INTO public.users (id, email, name, role, phone, family_name, given_name, name_confirmed_at)
  VALUES (
    NEW.id, v_email, v_name, user_role,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    v_family, v_given,
    CASE WHEN v_family IS NOT NULL THEN now() ELSE NULL END
  );

  BEGIN
    BEGIN
      academy_id_param := (NEW.raw_user_meta_data->>'academy_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN academy_id_param := NULL;
    END;
    BEGIN
      family_id_param := (NEW.raw_user_meta_data->>'family_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN family_id_param := NULL;
    END;

    IF academy_id_param IS NOT NULL
       AND EXISTS(SELECT 1 FROM public.academies WHERE id = academy_id_param) THEN
      CASE user_role
        WHEN 'manager' THEN
          -- 117: never attach a self-declared manager to an academy that
          -- already has one (same rule as managers_self_insert, 103). An
          -- existing manager adds co-managers server-side.
          IF NOT public.academy_has_active_manager(academy_id_param) THEN
            INSERT INTO public.managers (user_id, academy_id, phone)
            VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone');
          END IF;
        WHEN 'teacher' THEN
          INSERT INTO public.teachers (user_id, academy_id, phone)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone');
        WHEN 'parent' THEN
          INSERT INTO public.parents (user_id, academy_id, phone)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone');
        WHEN 'student' THEN
          INSERT INTO public.students (user_id, academy_id, phone, school_name)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'school_name');
        ELSE NULL;
      END CASE;
    END IF;

    IF family_id_param IS NOT NULL
       AND user_role IN ('student', 'parent')
       AND EXISTS(SELECT 1 FROM public.families
                  WHERE id = family_id_param
                    AND (academy_id_param IS NULL OR academy_id = academy_id_param)) THEN
      INSERT INTO public.family_members (user_id, family_id, role)
      VALUES (NEW.id, family_id_param, user_role)
      ON CONFLICT (user_id, family_id) DO NOTHING;
    END IF;

    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: optional linking failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- B. Revoke: no browser caller, no RLS policy uses them
-- ---------------------------------------------------------------------------
-- Only src/lib/database.types.ts mentions the first 19. The 3-arg
-- get_assignments_for_sessions overload is unused (the browser calls the
-- scoped 1-arg one). user_sole_managed_academies is called only through
-- dbAdmin (service role). get_student_grade_statistics and
-- get_priority_grades_for_student reference assignments.classroom_id, which
-- does not exist, so they already fail for every caller; reports-page.tsx
-- catches the error and falls back. Fix + re-grant with a caller check if
-- they are ever repaired.

REVOKE EXECUTE ON FUNCTION
  public.is_same_family(uuid, uuid),
  public.teaches_classroom(uuid, uuid),
  public.student_in_classroom(uuid, uuid),
  public.is_same_academy(uuid, uuid),
  public.get_academy_dashboard_stats(uuid),
  public.get_academy_trend_data(uuid, integer),
  public.get_academy_session_stats(uuid, timestamp without time zone, timestamp without time zone, date),
  public.can_access_assignment_grade(uuid, uuid),
  public.user_enrolled_classrooms(uuid),
  public.get_family_members_for_user(uuid),
  public.get_student_reports(uuid),
  public.is_parent_of_student(uuid, uuid),
  public.get_student_academy_ids(uuid),
  public.get_parent_academy_ids(uuid),
  public.get_teacher_academy_ids(uuid),
  public.get_assignment_grades_for_academy(uuid),
  public.get_attendance_for_academy(uuid),
  public.get_level_test_academy_id(uuid),
  public.get_assignments_for_sessions(uuid[], uuid, date),
  public.user_sole_managed_academies(uuid),
  public.get_student_grade_statistics(uuid, date, date),
  public.get_priority_grades_for_student(uuid, date, date, integer)
FROM authenticated;

-- ---------------------------------------------------------------------------
-- C. Caller checks on browser-called functions (bodies otherwise unchanged)
-- ---------------------------------------------------------------------------

-- teachers-page.tsx (manager)
CREATE OR REPLACE FUNCTION public.count_classrooms_by_teacher(teacher_ids uuid[], academy_id_param uuid)
 RETURNS TABLE(teacher_id uuid, classroom_count bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT c.teacher_id, COUNT(*)::BIGINT as classroom_count
    FROM classrooms c
    WHERE c.teacher_id = ANY(teacher_ids)
    AND c.academy_id = academy_id_param
    AND c.deleted_at IS NULL
    AND (auth.uid() IS NULL OR public.app_is_staff_of(academy_id_param))
    GROUP BY c.teacher_id;
$function$;

-- useStudentData.ts (manager/teacher)
CREATE OR REPLACE FUNCTION public.count_classrooms_by_student(student_ids uuid[])
 RETURNS TABLE(student_id uuid, classroom_count bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT cs.student_id, COUNT(*)::BIGINT as classroom_count
    FROM classroom_students cs
    WHERE cs.student_id = ANY(student_ids)
    AND public.app_can_view_student(cs.student_id)
    GROUP BY cs.student_id;
$function$;

-- parent-auth-wrapper.tsx passes session.user.id
CREATE OR REPLACE FUNCTION public.get_users_for_family(user_uuid uuid)
 RETURNS TABLE(id uuid, name text, email text, academy_id uuid, family_role text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND user_uuid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.name, u.email,
    COALESCE(s.academy_id, p.academy_id) as academy_id,
    fm.role as family_role
  FROM users u
  JOIN family_members fm ON u.id = fm.user_id
  LEFT JOIN students s ON u.id = s.user_id AND fm.role = 'student'
  LEFT JOIN parents p ON u.id = p.user_id AND fm.role = 'parent'
  WHERE fm.family_id IN (
    SELECT fm_parent.family_id FROM family_members fm_parent
    WHERE fm_parent.user_id = user_uuid
  );
END;
$function$;

-- mobile pages: student self or parent's selected child
CREATE OR REPLACE FUNCTION public.get_student_classrooms(student_uuid uuid, academy_uuids uuid[])
 RETURNS TABLE(classroom_id uuid, classrooms jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.app_can_view_student(student_uuid) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    cs.classroom_id,
    jsonb_build_object(
      'id', c.id, 'name', c.name, 'color', c.color, 'subject', c.subject,
      'academy_id', c.academy_id, 'teacher_id', c.teacher_id,
      'subjects', CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('id', s.id, 'name', s.name) ELSE NULL END
    ) as classrooms
  FROM classroom_students cs
  INNER JOIN classrooms c ON cs.classroom_id = c.id
  LEFT JOIN subjects s ON c.subject_id = s.id
  WHERE cs.student_id = student_uuid
    AND c.academy_id = ANY(academy_uuids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_assignment_grades(target_student_id uuid, start_date date, end_date date)
 RETURNS TABLE(id uuid, status text, score numeric, updated_at timestamp with time zone, submitted_date timestamp with time zone, assignment_data jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.app_can_view_student(target_student_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT ag.id, ag.status, ag.score, ag.updated_at, ag.submitted_date,
    jsonb_build_object(
      'id', a.id, 'title', a.title, 'assignment_type', a.assignment_type,
      'due_date', a.due_date, 'assignment_categories_id', a.assignment_categories_id,
      'classroom_session_id', a.classroom_session_id,
      'classroom_sessions', jsonb_build_object(
        'classroom_id', cs.classroom_id,
        'classrooms', jsonb_build_object(
          'id', c.id, 'name', c.name, 'grade', c.grade,
          'subjects', CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('id', s.id, 'name', s.name) ELSE null END
        )
      )
    ) as assignment_data
  FROM assignment_grades ag
  JOIN assignments a ON ag.assignment_id = a.id
  JOIN classroom_sessions cs ON a.classroom_session_id = cs.id
  JOIN classrooms c ON cs.classroom_id = c.id
  LEFT JOIN subjects s ON c.subject_id = s.id
  WHERE ag.student_id = target_student_id
    AND ag.submitted_date >= start_date
    AND ag.submitted_date <= end_date
    AND a.deleted_at IS NULL
    AND cs.deleted_at IS NULL
  ORDER BY ag.submitted_date ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_attendance(target_student_id uuid, start_date date, end_date date)
 RETURNS TABLE(id uuid, status text, note text, created_at timestamp with time zone, session_date date, classroom_name text, classroom_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.app_can_view_student(target_student_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT att.id, att.status, att.note, att.created_at,
    cs.date as session_date, c.name as classroom_name, c.id as classroom_id
  FROM attendance att
  JOIN classroom_sessions cs ON att.classroom_session_id = cs.id
  JOIN classrooms c ON cs.classroom_id = c.id
  WHERE att.student_id = target_student_id
    AND cs.date >= start_date
    AND cs.date <= end_date
    AND cs.deleted_at IS NULL
  ORDER BY cs.date ASC;
END;
$function$;

-- mobile/assignments: rows for classrooms the caller cannot see are dropped
CREATE OR REPLACE FUNCTION public.get_classroom_sessions(classroom_uuids uuid[])
 RETURNS TABLE(id uuid, classroom_id uuid, date date, start_time text, end_time text, status text, location text, classrooms jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT cs.id, cs.classroom_id, cs.date, cs.start_time, cs.end_time, cs.status, cs.location,
    jsonb_build_object(
      'id', c.id, 'name', c.name, 'color', c.color, 'academy_id', c.academy_id,
      'teacher_id', c.teacher_id, 'subject', c.subject,
      'subjects', CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('id', s.id, 'name', s.name) ELSE NULL END
    ) as classrooms
  FROM classroom_sessions cs
  LEFT JOIN classrooms c ON cs.classroom_id = c.id
  LEFT JOIN subjects s ON c.subject_id = s.id
  WHERE cs.classroom_id = ANY(classroom_uuids)
    AND cs.deleted_at IS NULL
    AND public.app_can_see_classroom(cs.classroom_id)
  ORDER BY cs.date DESC, cs.start_time ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_assignment_attachments(assignment_uuids uuid[])
 RETURNS TABLE(id uuid, assignment_id uuid, file_name text, file_url text, file_size integer, file_type text, uploaded_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT aa.id, aa.assignment_id, aa.file_name, aa.file_url, aa.file_size,
         aa.file_type, aa.uploaded_by, aa.created_at, aa.updated_at
  FROM assignment_attachments aa
  JOIN assignments a ON a.id = aa.assignment_id
  JOIN classroom_sessions cs ON cs.id = a.classroom_session_id
  WHERE aa.assignment_id = ANY(assignment_uuids)
    AND public.app_can_see_classroom(cs.classroom_id)
  ORDER BY aa.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_assignment_comments(assignment_uuids uuid[])
 RETURNS TABLE(id uuid, assignment_id uuid, user_id uuid, text text, created_at timestamp with time zone, updated_at timestamp with time zone, user_name text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT ac.id, ac.assignment_id, ac.user_id, ac.text, ac.created_at, ac.updated_at,
         u.name as user_name
  FROM assignment_comments ac
  JOIN users u ON ac.user_id = u.id
  JOIN assignments a ON a.id = ac.assignment_id
  JOIN classroom_sessions cs ON cs.id = a.classroom_session_id
  WHERE ac.assignment_id = ANY(assignment_uuids)
    AND public.app_can_see_classroom(cs.classroom_id)
  ORDER BY ac.created_at ASC;
END;
$function$;

-- api/subscription/status (user JWT); any member of the academy
CREATE OR REPLACE FUNCTION public.get_academy_storage_usage(p_academy_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  total_bytes BIGINT;
BEGIN
  IF auth.uid() IS NOT NULL AND p_academy_id NOT IN (SELECT public.caller_academy_ids()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(SUM(aa.file_size), 0)::BIGINT
  INTO total_bytes
  FROM assignment_attachments aa
  INNER JOIN assignments a ON aa.assignment_id = a.id
  INNER JOIN classroom_sessions cs ON a.classroom_session_id = cs.id
  INNER JOIN classrooms c ON cs.classroom_id = c.id
  WHERE c.academy_id = p_academy_id
    AND c.deleted_at IS NULL
    AND a.deleted_at IS NULL;
  RETURN total_bytes;
END;
$function$;

-- dashboard pages (manager/teacher of the academy)
CREATE OR REPLACE FUNCTION public.get_assignment_grade_counts_for_academy(p_academy_id uuid)
 RETURNS TABLE(assignment_id uuid, total_count bigint, submitted_count bigint, pending_count bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT ag.assignment_id,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE ag.status = 'submitted') as submitted_count,
    COUNT(*) FILTER (WHERE ag.status = 'pending') as pending_count
  FROM assignment_grades ag
  JOIN assignments a ON ag.assignment_id = a.id
  JOIN classroom_sessions cs ON a.classroom_session_id = cs.id
  JOIN classrooms c ON cs.classroom_id = c.id
  WHERE c.academy_id = p_academy_id
    AND a.deleted_at IS NULL
    AND (auth.uid() IS NULL OR public.app_is_staff_of(p_academy_id))
  GROUP BY ag.assignment_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_attendance_counts_for_academy(p_academy_id uuid)
 RETURNS TABLE(classroom_session_id uuid, total_count bigint, present_count bigint, absent_count bigint, late_count bigint, excused_count bigint, pending_count bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT a.classroom_session_id,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
    COUNT(*) FILTER (WHERE a.status = 'absent') as absent_count,
    COUNT(*) FILTER (WHERE a.status = 'late') as late_count,
    COUNT(*) FILTER (WHERE a.status = 'excused') as excused_count,
    COUNT(*) FILTER (WHERE a.status = 'pending') as pending_count
  FROM attendance a
  JOIN classroom_sessions cs ON a.classroom_session_id = cs.id
  JOIN classrooms c ON cs.classroom_id = c.id
  WHERE c.academy_id = p_academy_id
    AND cs.deleted_at IS NULL
    AND (auth.uid() IS NULL OR public.app_is_staff_of(p_academy_id))
  GROUP BY a.classroom_session_id;
$function$;

CREATE OR REPLACE FUNCTION public.classroom_performance_for_academy(p_academy_id uuid)
 RETURNS TABLE(classroom_id uuid, classroom_name text, classroom_color text, avg_score numeric, graded_count bigint, attendance_rate numeric, attendance_count bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH active AS (
    SELECT user_id FROM students
    WHERE academy_id = p_academy_id AND active IS TRUE
  ),
  rooms AS (
    SELECT id, name, color FROM classrooms
    WHERE academy_id = p_academy_id AND deleted_at IS NULL
      AND (auth.uid() IS NULL OR public.app_is_staff_of(p_academy_id))
  ),
  scores AS (
    SELECT cs.classroom_id,
           avg(g.score)::numeric AS avg_score,
           count(*)::bigint      AS graded_count
    FROM assignment_grades g
    JOIN assignments a          ON a.id = g.assignment_id AND a.deleted_at IS NULL
    JOIN classroom_sessions cs  ON cs.id = a.classroom_session_id AND cs.deleted_at IS NULL
    WHERE cs.classroom_id IN (SELECT id FROM rooms)
      AND g.score IS NOT NULL
      AND g.student_id IN (SELECT user_id FROM active)
    GROUP BY 1
  ),
  att AS (
    SELECT cs.classroom_id,
           (count(*) FILTER (WHERE at2.status = 'present')::numeric
             / NULLIF(count(*) FILTER (WHERE at2.status IN ('present','absent','late')), 0) * 100) AS rate,
           count(*)::bigint AS n
    FROM attendance at2
    JOIN classroom_sessions cs ON cs.id = at2.classroom_session_id AND cs.deleted_at IS NULL
    WHERE cs.classroom_id IN (SELECT id FROM rooms)
      AND at2.student_id IN (SELECT user_id FROM active)
    GROUP BY 1
  )
  SELECT r.id, r.name, r.color,
         round(s.avg_score, 1), coalesce(s.graded_count, 0),
         round(a.rate, 1),      coalesce(a.n, 0)
  FROM rooms r
  LEFT JOIN scores s ON s.classroom_id = r.id
  LEFT JOIN att    a ON a.classroom_id = r.id;
$function$;

CREATE OR REPLACE FUNCTION public.student_performance_for_academy(p_academy_id uuid)
 RETURNS TABLE(student_id uuid, student_name text, avg_score numeric, graded_count bigint, classroom_name text)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH graded AS (
    SELECT g.student_id, g.score, cs.classroom_id
    FROM assignment_grades g
    JOIN assignments a         ON a.id = g.assignment_id AND a.deleted_at IS NULL
    JOIN classroom_sessions cs ON cs.id = a.classroom_session_id AND cs.deleted_at IS NULL
    JOIN classrooms c          ON c.id = cs.classroom_id AND c.deleted_at IS NULL
    JOIN students s            ON s.user_id = g.student_id
    WHERE c.academy_id = p_academy_id
      AND s.academy_id = p_academy_id
      AND s.active IS TRUE
      AND g.score IS NOT NULL
      AND (auth.uid() IS NULL OR public.app_is_staff_of(p_academy_id))
  ),
  per_student AS (
    SELECT student_id, avg(score)::numeric AS avg_score, count(*)::bigint AS graded_count
    FROM graded GROUP BY 1
  ),
  main_room AS (
    SELECT DISTINCT ON (student_id) student_id, classroom_id
    FROM (SELECT student_id, classroom_id, count(*) n FROM graded GROUP BY 1,2) x
    ORDER BY student_id, n DESC, classroom_id
  )
  SELECT p.student_id, u.name, round(p.avg_score, 1), p.graded_count, c.name
  FROM per_student p
  JOIN users u      ON u.id = p.student_id
  LEFT JOIN main_room m ON m.student_id = p.student_id
  LEFT JOIN classrooms c ON c.id = m.classroom_id;
$function$;

-- CREATE OR REPLACE keeps existing grants, so none of section C needs a re-grant.
