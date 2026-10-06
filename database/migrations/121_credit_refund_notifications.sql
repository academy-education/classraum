-- 121: tell a student when an admin refunds their test credits — once.
--
-- Owner request 2026-10-06. Refunds made through the admin path
-- (src/lib/study/admin-session-refund.ts) were silent: the credits came back
-- but the student was never told. src/lib/study/credit-refund-notify.ts now
-- sends one in-app notice + one email per refund event.
--
--   study_credit_ledger.refund_notified_at
--       Claimed atomically on the REFUND rows (UPDATE ... WHERE
--       refund_notified_at IS NULL RETURNING) before anything is sent, so the
--       idempotent refund being re-run, two admins, or the backfill script
--       overlapping a live call can never notify the same credit twice.
--       Released again if the email send fails. Rows written before this
--       migration stay NULL; only notify-past-refunds.ts touches them.
--
--   notifications_type_check gains 'study_credits_refunded'. notifyStudent
--   gets { error } back from a CHECK violation, logs it and moves on, so a
--   missing kind here means the in-app notice silently never exists.
alter table public.study_credit_ledger
  add column if not exists refund_notified_at timestamptz;

alter table public.notifications drop constraint if exists notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      'session'::text,
      'attendance'::text,
      'billing'::text,
      'assignment'::text,
      'alert'::text,
      'grade'::text,
      'success'::text,
      'report'::text,
      'system'::text,
      'level_test'::text,
      'study_league_promoted'::text,
      'study_league_demoted'::text,
      'study_weekly_recap'::text,
      'study_streak_milestone'::text,
      'study_streak_at_risk'::text,
      'study_streak_saved'::text,
      'study_daily_challenge'::text,
      'study_duel_won'::text,
      'study_duel_lost'::text,
      'study_response_graded'::text,
      'study_payment_failed'::text,
      'study_subscription_expired'::text,
      'study_payment_receipt'::text,
      'study_credits_refunded'::text
    ])
  );
