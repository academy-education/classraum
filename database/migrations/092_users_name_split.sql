-- Steps 1 of the users.name split (docs/plans/name-split-plan.md §5.1).
-- ADDITIVE ONLY. Nothing dropped, nothing made NOT NULL, no data touched.
-- The backfill is migration 093 and is deliberately a separate file, because
-- 093 contains the only destructive statement in the whole change.
--
-- COLUMN NAMING — deliberate deviation from "first_name"/"last_name":
-- the plan (§4) is explicit that the data model is 성/이름, and that
-- "Last name"/"First name" invite Western ordering at every read site.
-- family_name = 성, given_name = 이름. For a Korean row the display form is
-- family_name || given_name (no space); for a Latin row it is
-- given_name || ' ' || family_name. Encoding the ROLE rather than the
-- POSITION is what makes that possible.
--
-- users.name is NOT dropped, NOT made generated, and stays NOT NULL.
-- A generated column would be NULL for 43% of rows (191/444) against a
-- NOT NULL constraint, and would silently rewrite every Latin name to have
-- no space. It stays authoritative and every writer of the split columns
-- must write it in the same statement.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS family_name               text NULL,
  ADD COLUMN IF NOT EXISTS given_name                text NULL,
  ADD COLUMN IF NOT EXISTS name_confirmed_at         timestamptz NULL,
  ADD COLUMN IF NOT EXISTS name_prompt_snoozed_until timestamptz NULL;

COMMENT ON COLUMN public.users.family_name IS
  '성 / family name. NULL means "the split rule could not do this row — ask the user". Never default to '''': that erases the signal.';
COMMENT ON COLUMN public.users.given_name IS
  '이름 / given name. NULL alongside family_name.';
COMMENT ON COLUMN public.users.name IS
  'Authoritative single-string name. NOT derived, NOT generated, stays NOT NULL. Fallback for the 191 rows with NULL family_name, and the value passed to PortOne at all 8 call sites.';
COMMENT ON COLUMN public.users.name_confirmed_at IS
  'Set when the user has affirmatively confirmed their 성/이름. Suppresses the re-prompt.';
COMMENT ON COLUMN public.users.name_prompt_snoozed_until IS
  'Re-prompt back-off. One value rather than a dismissal counter, so it cannot drift.';

-- family_members.relation — see plan §3.
-- family_members.role already exists but is only 'parent' | 'student', so
-- 아버지 vs 어머니 had nowhere to live, which is exactly WHY it ended up
-- welded into users.name for 150 accounts.
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS relation text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'family_members_relation_check'
      AND conrelid = 'public.family_members'::regclass
  ) THEN
    ALTER TABLE public.family_members
      ADD CONSTRAINT family_members_relation_check
      CHECK (relation IN ('father','mother','guardian','grandparent','other'));
  END IF;
END $$;

COMMENT ON COLUMN public.family_members.relation IS
  'Guardian relation. Structured home for 아버지/어머니, which was previously encoded into users.name for 150 parent accounts.';

-- No index. There are no name indexes today and exactly one server-side
-- order-by-person-name (usePaymentData.ts:121), which is out of scope for
-- this change. Add (family_name, given_name) only if it shows up in slow logs.
