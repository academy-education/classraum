-- When a review deck was first opened in the presenter.
--
-- A review set is a teacher-only deck: students never sit one
-- (/api/study/camp/start rejects kind='review' and the student shelf
-- excludes it), so unlike an assignment there is no "a student opened
-- it" signal to decide whether deleting it should refund the quota.
--
-- Without a marker the choice is between refunding always — which lets
-- a teacher build a deck, present it, delete it and recover the quota,
-- indefinitely — and refunding never, which punishes a typo. This
-- column is the fact that makes the rule enforceable: the presenter
-- fetch stamps it, and only an unstamped deck refunds.
--
-- Also useful on its own: it answers "was this deck ever actually used?"
ALTER TABLE public.camp_assignments
  ADD COLUMN IF NOT EXISTS presented_at timestamptz;

COMMENT ON COLUMN public.camp_assignments.presented_at IS
  'kind=review only: when the deck was first opened in the presenter. NULL means never presented, which is what makes a quota refund on delete safe.';
