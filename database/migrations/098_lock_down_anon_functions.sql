-- Close anon access to every SECURITY DEFINER function in public.
--
-- They bypass row-level security by design, and `anon` could call them
-- with nothing but the publishable key: academy revenue, academy-wide
-- grades and the parent-child family graph were all readable with no
-- Authorization header.
--
-- THREE THINGS MAKE THIS SAFE, each checked before running:
--
--  1. REVOKE FROM PUBLIC is the statement that matters. Postgres grants
--     EXECUTE to PUBLIC by default and anon inherits through it, so
--     revoking the named role alone does nothing — proved on
--     delete_user_account (migration 097): the first revoke reported
--     success and the endpoint still deleted a canary user.
--
--  2. Revoking PUBLIC also strips `authenticated`, so it is re-granted
--     explicitly. Four of these back RLS policies —
--     get_user_accessible_classrooms (15 policies), get_manager_academy_ids
--     (13), get_user_family_students (10), get_user_academy_ids (7) — and
--     a policy expression is evaluated AS THE QUERYING ROLE. Without the
--     re-grant every one of those policies fails and the app goes blank
--     for logged-in users.
--
--  3. No RLS policy anywhere grants `anon` (0 of them), and every
--     client-side .rpc() call sits on an authenticated page. Nothing
--     legitimate needs anon access to any of these.
--
-- Trigger functions are excluded — not callable over PostgREST.
-- Reversible: GRANT EXECUTE ON FUNCTION … TO anon.
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    WHERE ns.nspname = 'public'
      AND p.prosecdef
      AND acl.privilege_type = 'EXECUTE'
      AND (acl.grantee = 0 OR pg_get_userbyid(acl.grantee) = 'anon')
      AND p.prorettype <> 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.args);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'locked down % SECURITY DEFINER functions', n;
END $$;
