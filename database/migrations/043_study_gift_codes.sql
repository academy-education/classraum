-- 042: Gift SKU for Classraum Study.
-- Applied to prod via Supabase MCP as "study_gift_codes".
-- Pairs with the gift catalog in src/lib/study/gifts.ts and the
-- purchase/redeem routes under src/app/api/study/gift/.
--
-- A parent buys a one-time gift (POST /api/study/gift/purchase → a
-- PortOne charge), which mints one row here with a unique redemption
-- code. The student redeems the code (POST /api/study/gift/redeem),
-- which atomically flips status to 'redeemed' and grants Premium.
--
-- RLS is enabled but grants no client access: every read and write goes
-- through the service role (supabaseAdmin) in the routes, mirroring how
-- study_subscriptions / study_credit_ledger writes are handled. A
-- student never queries this table directly — redemption is a
-- service-role lookup by code — so no client SELECT policy is needed.

CREATE TABLE IF NOT EXISTS public.study_gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  purchaser_id uuid NOT NULL,
  months integer NOT NULL DEFAULT 3,
  credits integer NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'unredeemed' CHECK (status IN ('unredeemed', 'redeemed')),
  redeemed_by uuid,
  redeemed_at timestamptz,
  paid_amount_cents integer,
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive redemption lookups (the redeem route matches on
-- lower(code)); also the unique index backing the code column already
-- covers exact-case dedupe on insert.
CREATE INDEX IF NOT EXISTS study_gift_codes_lower_code_idx
  ON public.study_gift_codes (lower(code));
-- Purchaser's "gifts I bought" history.
CREATE INDEX IF NOT EXISTS study_gift_codes_purchaser_idx
  ON public.study_gift_codes (purchaser_id, created_at DESC);

-- Service-role-only: RLS on with no permissive policy blocks anon /
-- authenticated entirely; the routes use supabaseAdmin (service role,
-- which bypasses RLS).
ALTER TABLE public.study_gift_codes ENABLE ROW LEVEL SECURITY;
