-- 109: per-charge receipts for Classraum Study.
--
-- Until 2026-09-30 a successful subscription renewal (or pack/pass purchase)
-- sent the student nothing: no email, no in-app notice, no history page. Only
-- failures notified. Every charge now gets a receipt, and these columns make
-- that exactly-once and give the billing-history page something to read.
--
--   receipt_sent_at  claimed atomically (UPDATE ... WHERE receipt_sent_at IS
--                    NULL RETURNING) before the email goes out, so a cron re-run,
--                    a webhook racing the cron, or the backfill can never send
--                    twice. Released again if the send fails.
--   receipt_url      Inicis card sales slip (신용카드 매출전표) from PortOne.
--   order_name, paid_at   what PortOne says the card was charged for, and when.
alter table public.study_payments
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists receipt_url text,
  add column if not exists order_name text,
  add column if not exists paid_at timestamptz;

-- Renewal reminder, one per billing period: holds the current_period_end the
-- reminder was sent for, so a daily cron reminds once per period.
alter table public.study_subscriptions
  add column if not exists renewal_reminded_for timestamptz;

-- notifyStudent drops a row whose type is not in this list (see memory note
-- "notifications type-check study kinds"), so the new kind must be added here.
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
      'study_payment_receipt'::text
    ])
  );
