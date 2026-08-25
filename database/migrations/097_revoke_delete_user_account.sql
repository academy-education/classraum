-- Close an unauthenticated, destructive hole.
--
-- public.delete_user_account(uuid) is SECURITY DEFINER, takes the TARGET
-- user's id as a parameter, and contains no authorisation check at all —
-- it never calls auth.uid(), never verifies the caller is that user or an
-- admin. It then cascades deletes through attendance, grades, invoices,
-- enrolments, reports, family memberships, chat and support tickets
-- before deleting the user row.
--
-- EXECUTE was granted to `anon`. The publishable anon key ships in the
-- client bundle, the project URL is in next.config.js, and the function
-- name is in this very migrations directory — all three in a PUBLIC
-- GitHub repo. Deleting any account was one unauthenticated POST to
-- /rest/v1/rpc/delete_user_account.
--
-- Safe to revoke: nothing calls it. Account deletion goes through
-- /api/account/delete (which only SCHEDULES it) and a cron that calls
-- delete_user_account_cascade() with the service role. That replacement
-- is already granted to postgres + service_role only — the newer
-- function was written correctly; this is the superseded one.
--
-- Reversible: GRANT EXECUTE ... TO anon, authenticated.
--
-- Not dropped, only revoked. Dropping is the right follow-up once we are
-- certain no external tooling calls it, and a revoke is the smaller,
-- reversible step that closes the exposure today.

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM authenticated;

COMMENT ON FUNCTION public.delete_user_account(uuid) IS
  'SUPERSEDED by delete_user_account_cascade(). Has NO authorisation check '
  'and must never be granted to anon or authenticated again — see '
  'migration 097. Account deletion runs through /api/account/delete.';
