# Security follow-ups

## CLOSED 2026-08-25 — unauthenticated account deletion

`public.delete_user_account(uuid)` was SECURITY DEFINER, took the TARGET
user's id as a parameter, and had **no authorisation check** — it never
called `auth.uid()`. It cascaded deletes through attendance, grades,
invoices, enrolments, reports, family memberships, chat and support
tickets, then deleted the user.

Reachable by anyone: the anon key ships in the client bundle AND is
hardcoded in `public/test-supabase.html`, the project URL is in
`next.config.js`, and the function name is in this repo's migrations —
all in a **public** GitHub repo.

### The part that nearly got missed

The first revoke targeted `anon` and `authenticated` and reported
success. **It did nothing.** Postgres grants EXECUTE to `PUBLIC` by
default and `anon` inherits through PUBLIC, so revoking the named roles
left the function wide open. Proven by calling the endpoint
unauthenticated afterwards — it deleted a canary user.

    REVOKE EXECUTE ON FUNCTION … FROM PUBLIC;   -- this is the one that matters

Verified after: anon → 401, logged-in → 403, canary survives.
Migration 097. Reversible with a GRANT.

**Never trust a REVOKE that only names roles. Check `grantee = 0`
(PUBLIC) in `aclexplode`, and re-run the attack afterwards.**

## OPEN — 42 read functions still reachable by anon

43 of 55 SECURITY DEFINER functions were exposed; one was destructive
and is now closed. The rest are reads, and they bypass RLS by design:

    get_academy_dashboard_stats            → revenue, user counts
    get_assignment_grades_for_academy      → grades, academy-wide
    get_family_members_for_user            → which parent belongs to which student
    get_user_academy_ids                   → academy membership
    …and 38 more

Confirmed reachable with no Authorization header. Not an emergency —
nothing here destroys data — but it is a real privacy exposure for an
app holding data on minors.

**Do not bulk-revoke.** A logged-in user acts as `authenticated`, not
`anon`, so revoking anon *should* be safe for everything the app calls
after login — but that has to be checked per function, and a wrong
revoke breaks a screen. The mechanism is now understood, which makes
this tractable: revoke from PUBLIC and from anon, keep authenticated,
then exercise the app.

## OPEN — smaller items

- 5 SECURITY DEFINER **views** (`study_item_calibration`,
  `study_item_review_results`, `study_item_reviews_fresh`,
  `study_item_attacks_fresh`, `study_item_attack_coverage`)
- RLS disabled on `study_item_reviews`, `study_item_attacks`,
  and `users_name_backup_20260820` (that last one is a migration
  snapshot holding every user's name — drop it)
- Leaked-password protection is off in Auth settings
- Postgres version has published vulnerabilities; needs the upgrade
- 7 functions with a mutable `search_path`
- `public/test-supabase.html` and `public/test.html` are debug pages
  served in production; delete them
