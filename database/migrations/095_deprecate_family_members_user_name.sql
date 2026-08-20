-- 095: mark family_members.user_name DEPRECATED.
--
-- NOTHING IS DROPPED HERE. This migration adds a column comment and nothing
-- else; dropping the column is a separate, destructive migration and the
-- conditions for it are listed at the bottom of this file.
--
-- WHY
-- ---
-- `user_name` is a denormalised copy of the person's name, taken at the time
-- the family_members row was created and never maintained afterwards. Every
-- linked row (user_id IS NOT NULL) already has the authoritative name one
-- join away in public.users.
--
-- Measured on the live database on 2026-08-20, AFTER migration 093:
--
--   family_members rows                                        364
--     linked   (user_id IS NOT NULL)                           351
--     unlinked (user_id IS NULL, invited but unclaimed)         13
--   linked rows with a non-empty user_name                     301
--     …disagreeing with users.name                             151
--     …agreeing with users.name                                150
--   linked rows whose user row does not exist                    0
--
-- The name-split plan recorded this as "301 of 301 drifted (100%)". That was
-- measured BEFORE 093 un-masked users.name; the un-masking moved 150 rows
-- into agreement. The remaining 151 are the relationship-label rows
-- ("박주원 어머니" here vs the still-masked "박**" in users.name) plus one
-- genuine stale invite name:
--
--   family_members.id = a2c826cd-c8d9-4c96-9da4-b90d616aba28
--     user_name  = 'Jason Kim'      <- frozen at invite time
--     users.name = '김준수'          <- what the person is actually called
--                  (family_name '김', given_name '준수')
--
-- Note which direction the drift runs in: for the 151, user_name is often the
-- BETTER string. It is still not the authoritative one, and a second opinion
-- that no writer maintains is exactly how a name goes stale in one place and
-- not the other. Fix the source (users.name), do not read the copy.
--
-- WHAT CHANGED IN THE APPLICATION (this commit)
-- ---------------------------------------------
--  * src/app/api/academy/join/route.ts no longer writes user_name when it
--    inserts a LINKED member. That was the last writer for a row that has a
--    user_id.
--  * src/components/ui/families-page.tsx reads the name for a linked member
--    through displayName(users) — the 성/이름 columns with the users.name
--    fallback — instead of users.name directly.
--
-- THE READS THAT LEGITIMATELY REMAIN (user_id IS NULL — there is no user row)
-- --------------------------------------------------------------------------
--  * src/app/auth/page.tsx           — invite signup pre-fill; the query is
--                                      guarded with .is('user_id', null).
--  * src/app/api/academy/join/route.ts (GET) — invite preview; 404s unless
--                                      member.user_id IS NULL.
--  * src/components/ui/families-page.tsx — the pre-registration branch, taken
--                                      only when there is no user row to join.
--  * src/lib/csv-parser.ts + FamilyImportModal — the importer creates rows
--                                      with user_id NULL, so user_name is the
--                                      ONLY name those people have anywhere.
--
-- BEFORE DROPPING THIS COLUMN IS SAFE, ALL OF THESE MUST BE TRUE
-- --------------------------------------------------------------
--  1. The invite name has somewhere else to live for an UNCLAIMED row.
--     Today it has none: user_id is NULL, so there is no users row. Dropping
--     the column without a replacement (e.g. an `invites` table, or
--     invited_name on family_members) deletes the only copy of 13 names and
--     breaks the signup pre-fill.
--  2. The four read sites above are migrated to that replacement.
--  3. `SELECT count(*) FROM family_members WHERE user_id IS NULL` is
--     accounted for — every such row is either migrated or genuinely dead.
--  4. Claim-time behaviour is settled: when an invite is claimed we either
--     clear the invite name or accept that it is kept as history. Leaving it
--     populated on a linked row is what produced the 151 drifted rows.
--  5. No generated types, PostgREST client, or external consumer still
--     selects it (grep src/lib/database.types.ts after regeneration).

COMMENT ON COLUMN public.family_members.user_name IS
  'DEPRECATED (migration 095, 2026-08-20). Denormalised copy of the person''s name, '
  'frozen at row-creation time and never maintained: 151 of 301 linked rows disagree '
  'with users.name. For a LINKED row (user_id IS NOT NULL) join public.users and use '
  'users.name / the family_name+given_name pair via src/lib/name.ts displayName(); '
  'never read this column. It remains valid ONLY for an invited-but-unclaimed row '
  '(user_id IS NULL), where no users row exists yet and this is the invite name used '
  'to pre-fill signup. Do not write it for a row that has a user_id. Not dropped: see '
  'the conditions in database/migrations/095_deprecate_family_members_user_name.sql.';
