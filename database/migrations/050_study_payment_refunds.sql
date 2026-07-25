-- 050: study payment refund tracking + backfill subscription charges
--
-- 1. Track refunds locally so the admin payments view can show refunded state
--    without a per-row live PortOne lookup (fast across the global list).
-- 2. Backfill: subscription charges historically only persisted the LATEST id
--    on study_subscriptions (last_payment_id). Materialize those as
--    study_payments rows so the payments view is complete and each is
--    refundable, exactly like credit packs / exam passes.

ALTER TABLE public.study_payments
  ADD COLUMN IF NOT EXISTS refunded_at   timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- price_cents is priceWon * 100 (see activate-subscription / study-billing).
INSERT INTO public.study_payments (payment_id, student_id, kind, amount_won, created_at)
SELECT s.last_payment_id,
       s.student_id,
       'study_subscription',
       COALESCE(NULLIF(s.price_cents, 0) / 100, 0),
       COALESCE(s.last_payment_attempt_at, s.updated_at, now())
FROM public.study_subscriptions s
WHERE s.last_payment_id IS NOT NULL
ON CONFLICT (payment_id) DO NOTHING;
