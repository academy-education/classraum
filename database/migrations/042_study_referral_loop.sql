-- 042: Referral loop for Classraum Study (B2C).
-- Applied to the live Supabase project via MCP as "study_referral_loop".
-- This file captures the DDL so the schema is reproducible from the repo.
--
-- Each student owns one short referral code. When a new student redeems
-- a friend's code, BOTH sides get +5 purchased test credits (exactly
-- once). Reward-granting happens in the API route AFTER the redemption
-- row is committed; the unique constraint on referee_id makes the pair
-- unique and guards against double-reward under races.
--
-- All writes go through service-role routes (supabaseAdmin). RLS is on
-- with owner-only SELECT policies, mirroring study_credit_ledger.

CREATE TABLE IF NOT EXISTS public.study_referral_codes (
  student_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- A user can only ever be referred once. This is the race guard: two
  -- concurrent redeem calls for the same referee → one wins, the other
  -- hits a unique violation and is treated as already_redeemed.
  CONSTRAINT study_referral_redemptions_referee_unique UNIQUE (referee_id)
);
CREATE INDEX IF NOT EXISTS study_referral_redemptions_referrer_idx
  ON public.study_referral_redemptions (referrer_id);

ALTER TABLE public.study_referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_referral_codes_select_own ON public.study_referral_codes;
CREATE POLICY study_referral_codes_select_own ON public.study_referral_codes
  FOR SELECT USING (auth.uid() = student_id);

ALTER TABLE public.study_referral_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_referral_redemptions_select_own ON public.study_referral_redemptions;
CREATE POLICY study_referral_redemptions_select_own ON public.study_referral_redemptions
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
-- All writes go through the service role (supabaseAdmin) in the routes.

-- Allow the referral reward to be recorded in the credit ledger.
ALTER TABLE public.study_credit_ledger
  DROP CONSTRAINT IF EXISTS study_credit_ledger_kind_check;
ALTER TABLE public.study_credit_ledger
  ADD CONSTRAINT study_credit_ledger_kind_check
  CHECK (kind = ANY (ARRAY['grant', 'purchase', 'debit', 'refund', 'trial_grant', 'referral']));
