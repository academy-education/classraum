-- Test-credit system for Classraum Study (two-tier subscriptions).
-- Applied to prod 2026-07-06 via Supabase MCP as "study_credit_system".
-- Pairs with the plan catalog in src/lib/study/plans.ts.
--
-- Model: two counters on the subscription row (fast, atomic) + an
-- append-only ledger (auditable). Monthly grants RESET each billing
-- cycle; purchased pack credits never expire and are consumed only
-- after the grant runs out. Debit/refund are idempotent per session
-- via a partial unique index on the ledger.

ALTER TABLE public.study_subscriptions
  ADD COLUMN IF NOT EXISTS grant_credits_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_credits_remaining integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.study_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  delta integer NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('grant', 'purchased')),
  kind text NOT NULL CHECK (kind IN ('grant', 'purchase', 'debit', 'refund', 'trial_grant')),
  source_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_credit_ledger_student_idx
  ON public.study_credit_ledger (student_id, created_at DESC);
-- One debit and one refund max per source (test session).
CREATE UNIQUE INDEX IF NOT EXISTS study_credit_ledger_once_per_source
  ON public.study_credit_ledger (student_id, kind, source_id)
  WHERE source_id IS NOT NULL AND kind IN ('debit', 'refund');

ALTER TABLE public.study_credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_credit_ledger_select_own ON public.study_credit_ledger;
CREATE POLICY study_credit_ledger_select_own ON public.study_credit_ledger
  FOR SELECT USING (auth.uid() = student_id);
-- All writes go through SECURITY DEFINER functions / service role.

-- Atomically consume one credit (grant bucket first, then purchased).
-- Idempotent: a second call with the same source returns ok without
-- double-charging. Returns jsonb {ok, bucket?, grant, purchased}.
CREATE OR REPLACE FUNCTION public.use_study_credit(p_student uuid, p_source uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_grant integer;
  v_purchased integer;
  v_bucket text;
BEGIN
  IF EXISTS (SELECT 1 FROM study_credit_ledger
             WHERE student_id = p_student AND kind = 'debit' AND source_id = p_source) THEN
    SELECT grant_credits_remaining, purchased_credits_remaining
      INTO v_grant, v_purchased
      FROM study_subscriptions WHERE student_id = p_student;
    RETURN jsonb_build_object('ok', true, 'already', true,
      'grant', COALESCE(v_grant, 0), 'purchased', COALESCE(v_purchased, 0));
  END IF;

  SELECT grant_credits_remaining, purchased_credits_remaining
    INTO v_grant, v_purchased
    FROM study_subscriptions
    WHERE student_id = p_student
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_subscription');
  END IF;

  IF v_grant > 0 THEN
    v_bucket := 'grant';
    UPDATE study_subscriptions
      SET grant_credits_remaining = grant_credits_remaining - 1, updated_at = now()
      WHERE student_id = p_student;
    v_grant := v_grant - 1;
  ELSIF v_purchased > 0 THEN
    v_bucket := 'purchased';
    UPDATE study_subscriptions
      SET purchased_credits_remaining = purchased_credits_remaining - 1, updated_at = now()
      WHERE student_id = p_student;
    v_purchased := v_purchased - 1;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'no_credits',
      'grant', 0, 'purchased', 0);
  END IF;

  INSERT INTO study_credit_ledger (student_id, delta, bucket, kind, source_id)
    VALUES (p_student, -1, v_bucket, 'debit', p_source);

  RETURN jsonb_build_object('ok', true, 'bucket', v_bucket,
    'grant', v_grant, 'purchased', v_purchased);
END $$;

-- Refund a previously debited credit (generation failed after the
-- reserve). Idempotent; restores the same bucket the debit came from.
CREATE OR REPLACE FUNCTION public.refund_study_credit(p_student uuid, p_source uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_bucket text;
BEGIN
  SELECT bucket INTO v_bucket FROM study_credit_ledger
    WHERE student_id = p_student AND kind = 'debit' AND source_id = p_source;
  IF v_bucket IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_debit');
  END IF;
  IF EXISTS (SELECT 1 FROM study_credit_ledger
             WHERE student_id = p_student AND kind = 'refund' AND source_id = p_source) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  PERFORM 1 FROM study_subscriptions WHERE student_id = p_student FOR UPDATE;

  IF v_bucket = 'grant' THEN
    UPDATE study_subscriptions
      SET grant_credits_remaining = grant_credits_remaining + 1, updated_at = now()
      WHERE student_id = p_student;
  ELSE
    UPDATE study_subscriptions
      SET purchased_credits_remaining = purchased_credits_remaining + 1, updated_at = now()
      WHERE student_id = p_student;
  END IF;

  INSERT INTO study_credit_ledger (student_id, delta, bucket, kind, source_id)
    VALUES (p_student, 1, v_bucket, 'refund', p_source);

  RETURN jsonb_build_object('ok', true, 'bucket', v_bucket);
END $$;

-- Grandfather existing rows: legacy single plan becomes General, and
-- currently-live subscribers/trialers get an initial grant so nobody
-- is suddenly locked out mid-period (8 = General monthly grant,
-- 3 = trial allotment).
UPDATE public.study_subscriptions SET plan = 'general_v1' WHERE plan = 'monthly_v1';
UPDATE public.study_subscriptions
  SET grant_credits_remaining = 8
  WHERE status = 'active' AND grant_credits_remaining = 0 AND purchased_credits_remaining = 0;
UPDATE public.study_subscriptions
  SET grant_credits_remaining = 3
  WHERE status = 'trial' AND current_period_end > now()
    AND grant_credits_remaining = 0 AND purchased_credits_remaining = 0;

-- (applied separately as "study_pending_plan") Scheduled plan changes:
-- downgrades take effect at the next renewal; upgrades are immediate.
ALTER TABLE public.study_subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan text;
