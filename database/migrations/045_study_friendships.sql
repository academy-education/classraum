-- 045: Friend graph for Classraum Study (B2C).
-- Applied to the live Supabase project via MCP as "study_friendships".
-- This file captures the DDL so the schema is reproducible from the repo.
--
-- One row per relationship, directed by who sent the request, but treated
-- as an undirected edge once status='accepted'. A partial unique index on
-- the UNORDERED (least, greatest) pair prevents duplicate requests and an
-- A->B / B->A pair from coexisting. Friends are added by friend code (the
-- referral code) or by nickname search; referrer<->referee are auto-added
-- as accepted friends on redemption.
--
-- All writes go through service-role routes (supabaseAdmin). RLS is on with
-- a read policy scoped to either party, mirroring the referral tables.

CREATE TABLE IF NOT EXISTS public.study_friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS study_friendships_pair_key
  ON public.study_friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS study_friendships_requester_idx ON public.study_friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS study_friendships_addressee_idx ON public.study_friendships (addressee_id, status);

ALTER TABLE public.study_friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_friendships_own_read ON public.study_friendships;
CREATE POLICY study_friendships_own_read ON public.study_friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
