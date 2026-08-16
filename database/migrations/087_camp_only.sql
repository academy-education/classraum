-- 087: Camp-only academies — schools that ONLY run camp programs get a
-- minimal app surface (Camp, Families, Settings, Archive, Help, Logout)
-- and land on /camp-program after login instead of /dashboard.
--
-- Like camp_programs themselves (081), the flag is set MANUALLY by us
-- when such a school is onboarded; there is no UI that writes it. The
-- default is false, so every existing academy is unaffected.
--
-- Read path: the sidebar reads it with the client (same query pattern as
-- its camp_programs check). academies has a member-read RLS policy
-- ("Users can read own academy") but — discovered while verifying this
-- migration — NO table grant for `authenticated` at all, so every
-- client read of academies (including the app layout's logo_url fetch)
-- has been failing with "permission denied". Grant SELECT on exactly
-- the columns the client legitimately reads, column-scoped because the
-- row also carries bank_account, business_registration_number and
-- onboarding_token, which must stay server-only. RLS still scopes rows
-- to the member's own academy.

alter table academies
  add column if not exists camp_only boolean not null default false;

comment on column academies.camp_only is
  'Camp-only school: minimal sidebar + /camp-program landing. Set manually, like camp program grants.';

grant select (id, name, logo_url, camp_only) on academies to authenticated;
