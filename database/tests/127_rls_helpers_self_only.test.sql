-- 127 test: run in a transaction that always rolls back (the final RAISE aborts it).
-- Reports, for a parent and a teacher, what RLS lets them see BEFORE and AFTER
-- the migration body, plus self vs other-user calls to the two helpers.
-- Usage: run once with :apply = false (baseline), once with the migration
-- statements pasted above the DO block (after). Nothing is committed either way.
DO $test$
DECLARE
  parent_id uuid := '1b4fd72c-27de-48df-b3d3-321809d50f40';
  other_parent uuid := '4a82e151-302f-4cee-81c4-adf9cf3f91d3';
  teacher_id uuid := '2498588a-9cce-4077-a1b1-e2ed503de7b2';
  out text := '';
  n bigint;
  ids uuid[];
BEGIN
  -- as the parent
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_id, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM attendance;            out := out || 'parent attendance=' || n;
  SELECT count(*) INTO n FROM assignment_grades;     out := out || ' grades=' || n;
  SELECT count(*) INTO n FROM classroom_students;    out := out || ' classroom_students=' || n;
  SELECT count(*) INTO n FROM invoices;              out := out || ' invoices=' || n;
  SELECT count(*) INTO n FROM classroom_sessions;    out := out || ' sessions=' || n;
  ids := get_user_family_students(parent_id);        out := out || ' | self_family=' || coalesce(array_length(ids,1),0);
  ids := get_user_family_students(other_parent);     out := out || ' other_family=' || coalesce(array_length(ids,1),0);
  ids := get_user_accessible_classrooms(teacher_id); out := out || ' other_classrooms=' || coalesce(array_length(ids,1),0);
  EXECUTE 'RESET ROLE';

  -- as the teacher
  PERFORM set_config('request.jwt.claims', json_build_object('sub', teacher_id, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM classroom_sessions;    out := out || ' || teacher sessions=' || n;
  SELECT count(*) INTO n FROM assignments;           out := out || ' assignments=' || n;
  SELECT count(*) INTO n FROM classroom_students;    out := out || ' classroom_students=' || n;
  ids := get_user_accessible_classrooms(teacher_id); out := out || ' | self_classrooms=' || coalesce(array_length(ids,1),0);
  EXECUTE 'RESET ROLE';

  -- server side (no auth.uid())
  PERFORM set_config('request.jwt.claims', '', true);
  ids := get_user_family_students(other_parent);     out := out || ' || server other_family=' || coalesce(array_length(ids,1),0);

  RAISE EXCEPTION 'RESULT %', out;
END
$test$;
