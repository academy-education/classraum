-- 106: academies.email / academies.phone
--
-- NOT YET APPLIED. This is the follow-up to a bug, and applying it is a
-- product decision Andy has to make — see the note at the bottom.
--
-- The onboarding form (src/app/onboarding/[token]/page.tsx) has always
-- collected an academy email and phone, labelled "Optional. Shown to parents
-- and students." The API route put them straight into an `academies` update.
-- Neither column has ever existed, so PostgREST answered
--
--     Could not find the 'email' column of 'academies' in the schema cache
--
-- and rejected the WHOLE statement — which in the same breath clears the
-- single-use onboarding token and stamps onboarding_completed_at. So a school
-- that typed a phone number could not finish onboarding at all, and one that
-- left both blank could. The generated types never had the columns either;
-- the old supabase-js just did not check update payloads, and the typed
-- client in 2.116 does. That is how this surfaced.
--
-- The immediate fix stopped the route from writing them and stopped the form
-- from collecting them, so onboarding works and nothing a school types is
-- silently dropped. This migration is the other way to close it: give the
-- columns a home and turn the two fields back on.

alter table academies
  add column if not exists email text,
  add column if not exists phone text;

comment on column academies.email is
  'Public contact email for the academy. Shown to parents and students; not an auth identity.';
comment on column academies.phone is
  'Public contact phone for the academy. Shown to parents and students.';

-- The client reads academies through a column-scoped grant (see 087): the row
-- also carries bank_account, business_registration_number and
-- onboarding_token, which must stay server-only. Extend the grant rather than
-- widening it to the whole row.
grant select (id, name, logo_url, camp_only, email, phone) on academies to authenticated;

-- TO APPLY:
--   1. run this file
--   2. regenerate src/lib/database.types.ts
--   3. revert the two "column does not exist" guards — the removed inputs in
--      src/app/onboarding/[token]/page.tsx and the two writes in
--      src/app/api/onboarding/[token]/route.ts. Both are one commit.
--   4. re-run `npx tsc --noEmit`; the typed client will confirm the writes
--      match the schema, which is the check that caught this in the first place.
