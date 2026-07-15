-- 046: 1v1 head-to-head XP duels for Classraum Study (B2C).
-- Applied to the live Supabase project via MCP as "study_challenges".
-- This file captures the DDL so the schema is reproducible from the repo.
--
-- A student challenges a friend; when the opponent accepts, the duel runs
-- for 7 days (start_at..end_at). Each side's score is the sum of their
-- study_xp_events.xp in that window. The winner is finalized on the first
-- read after end_at (lazy resolution) or by the weekly league cron. A
-- partial unique index allows at most one OPEN (pending/active) duel per
-- unordered pair.
--
-- All writes go through service-role routes (supabaseAdmin). RLS is on with
-- a read policy scoped to either participant.

CREATE TABLE IF NOT EXISTS public.study_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled')),
  start_at timestamptz,
  end_at timestamptz,
  challenger_xp integer NOT NULL DEFAULT 0,
  opponent_xp integer NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  resolved_at timestamptz,
  CHECK (challenger_id <> opponent_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS study_challenges_open_pair_key
  ON public.study_challenges (least(challenger_id, opponent_id), greatest(challenger_id, opponent_id))
  WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS study_challenges_challenger_idx ON public.study_challenges (challenger_id, status);
CREATE INDEX IF NOT EXISTS study_challenges_opponent_idx ON public.study_challenges (opponent_id, status);
CREATE INDEX IF NOT EXISTS study_challenges_active_end_idx ON public.study_challenges (end_at) WHERE status = 'active';

ALTER TABLE public.study_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_challenges_own_read ON public.study_challenges;
CREATE POLICY study_challenges_own_read ON public.study_challenges
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
