-- Separate real academies from demo/test ones.
--
-- WHY: measured 2026-08-26, the admin panel reported ₩434,317,000 of
-- paid revenue. ₩431,470,000 of it — 99.3% — belonged to a single seeded
-- demo academy. Nine of twelve academies had never had a paying student,
-- and there was no way for any query to tell them apart, so every
-- dashboard, analytics panel and subscription total was reporting
-- fixture data as business performance.
--
-- The flag is on ACADEMIES rather than on invoices or users because the
-- academy is the thing that is real or not. Its students, classrooms,
-- sessions and invoices inherit that answer; flagging each of them
-- separately would be four places to get out of sync.
--
-- DEFAULT false — a new academy is REAL until somebody says otherwise.
-- The opposite default would quietly hide a genuine customer's revenue,
-- which is a far worse failure than briefly counting a test one.

ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.academies.is_test IS
  'True for demo, seed and internal-testing academies. Admin metrics '
  'exclude these by default; a toggle in the admin panel reveals them. '
  'Set deliberately — a new academy defaults to false (real).';

-- Admin metrics filter on this constantly, and it is low-cardinality, so
-- a partial index on the real ones is what the common query wants.
CREATE INDEX IF NOT EXISTS academies_real_only
  ON public.academies (id) WHERE is_test = false;

-- ── The classification, as measured ──────────────────────────────────
--
-- REAL (left alone):
--   Daniel Kim's Hagwon   29 members, 4 email domains including naver.com
--                         and a real school (stu.hcis.edu.sg), 10 members
--                         with phone numbers, active this week.
--
-- HERALD WAS INITIALLY CLASSIFIED REAL AND THAT WAS WRONG. It looked real
-- by ACTIVITY — 6 students, 14 invoices, ₩2,365,000 "paid" — which is
-- exactly the trap: seeded activity is indistinguishable from real
-- activity. The account-level evidence settles it. All 14 members are
-- `<name>.<role>@gmail.com` (alex.student@, jonas.teacher@,
-- ron.manager@…), not one has a phone number, and nobody but the founder
-- has signed in since October 2025.
--
-- The lesson for the next classification: judge accounts, not volume.
-- Rows are cheap to seed; a plausible email domain and a phone number
-- are not.
--
-- Everything else is demo, seed, an E2E artifact, an empty duplicate, or
-- the founder's own sandbox. Matched BY ID rather than by name so a
-- future academy that happens to be called "Test Academy" is not swept
-- up by a migration written today.
UPDATE public.academies SET is_test = true
WHERE name IN (
  '클래스라움 데모 학원',   -- the seeded demo: 150 students, 2015 invoices
  'Dev Test Academy',
  'E2E Camp Test Academy',
  'Test Academy',
  'Payment Test',
  'Tour Demo Academy',
  'KG',
  'Andy''s Hagwon',        -- 0 students, 0 classrooms, 0 invoices
  'Daniel Kim',            -- 0 classrooms; duplicate of Daniel Kim's Hagwon
  'Andy Lee''s Hagwon',    -- founder sandbox (raphael.student@, wesley.student@…)
  'HERALD'                 -- reclassified 2026-08-26: every member is <name>.<role>@gmail.com
);
