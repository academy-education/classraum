-- 112: close the anon exposure flagged by the security advisor (ops-health 2026-10-02)
--
-- 1. Five study_item_* views ran as their owner (SECURITY DEFINER semantics)
--    and were granted to anon + authenticated, so the public anon key could
--    read review answer slots (key_slot, blind_pick), reviewer notes and
--    calibration data over /rest/v1, around RLS on the base tables.
--    Every reader is service-role (dbAdmin in /api/admin/bank-qc/*, and the
--    scripts/study-bank/*.mjs tools on SUPABASE_SERVICE_ROLE_KEY). service_role
--    has BYPASSRLS, so security_invoker changes nothing for it.
--
-- 2. Six SECURITY DEFINER helpers were EXECUTE-able by anon (created after 098).
--    app_user_role(uid) told an anonymous caller any user's role.
--    The policies that call them keep working for `authenticated`:
--      managers / parents policies are already TO authenticated;
--      the three assignment_grades policies were TO public, so anon queries
--      would now raise 42501 instead of returning []. They can never pass for
--      anon (auth.uid() is null -> role null), so scoping them TO authenticated
--      preserves anon's result exactly (empty) without the function call.

-- Views ---------------------------------------------------------------------
ALTER VIEW public.study_item_reviews_fresh    SET (security_invoker = true);
ALTER VIEW public.study_item_calibration      SET (security_invoker = true);
ALTER VIEW public.study_item_attacks_fresh    SET (security_invoker = true);
ALTER VIEW public.study_item_review_results   SET (security_invoker = true);
ALTER VIEW public.study_item_attack_coverage  SET (security_invoker = true);

REVOKE ALL ON public.study_item_reviews_fresh    FROM anon, authenticated;
REVOKE ALL ON public.study_item_calibration      FROM anon, authenticated;
REVOKE ALL ON public.study_item_attacks_fresh    FROM anon, authenticated;
REVOKE ALL ON public.study_item_review_results   FROM anon, authenticated;
REVOKE ALL ON public.study_item_attack_coverage  FROM anon, authenticated;

-- Policies that call the helpers: anon can never satisfy them ---------------
ALTER POLICY assignment_grades_managers_access ON public.assignment_grades TO authenticated;
ALTER POLICY assignment_grades_parents_access  ON public.assignment_grades TO authenticated;
ALTER POLICY assignment_grades_teachers_access ON public.assignment_grades TO authenticated;

-- Functions -----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.app_user_role(uuid)                    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_teaches_assignment(uuid, uuid)     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_can_manage_assignment(uuid, uuid)  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.academy_has_active_manager(uuid)       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_manager_of(uuid)             FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.caller_academy_ids()                   FROM anon, PUBLIC;

-- ROLLBACK -------------------------------------------------------------------
-- ALTER VIEW public.study_item_reviews_fresh    RESET (security_invoker);
-- ALTER VIEW public.study_item_calibration      RESET (security_invoker);
-- ALTER VIEW public.study_item_attacks_fresh    RESET (security_invoker);
-- ALTER VIEW public.study_item_review_results   RESET (security_invoker);
-- ALTER VIEW public.study_item_attack_coverage  RESET (security_invoker);
-- GRANT ALL ON public.study_item_reviews_fresh, public.study_item_calibration,
--   public.study_item_attacks_fresh, public.study_item_review_results,
--   public.study_item_attack_coverage TO anon, authenticated;
-- ALTER POLICY assignment_grades_managers_access ON public.assignment_grades TO public;
-- ALTER POLICY assignment_grades_parents_access  ON public.assignment_grades TO public;
-- ALTER POLICY assignment_grades_teachers_access ON public.assignment_grades TO public;
-- GRANT EXECUTE ON FUNCTION public.app_user_role(uuid), public.app_teaches_assignment(uuid, uuid),
--   public.app_can_manage_assignment(uuid, uuid), public.academy_has_active_manager(uuid),
--   public.is_active_manager_of(uuid), public.caller_academy_ids() TO anon;
