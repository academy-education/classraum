-- 044: Nicknames for Classraum Study (B2C).
-- Applied to the live Supabase project via MCP as "study_nickname".
-- This file captures the DDL so the schema is reproducible from the repo.
--
-- A nickname is a public, unique handle shown on leaderboards in place of
-- the masked real name, and searchable when adding friends. It lives on
-- the existing study prefs row (one per student) rather than a new table.
-- NULL until the student sets one — the leaderboard falls back to the
-- masked real name for anyone without a nickname.
--
-- Uniqueness is case-insensitive via a functional unique index on
-- lower(nickname), so "Andy" and "andy" can't both be claimed. The index
-- is partial (WHERE nickname IS NOT NULL) so unset rows don't collide.

ALTER TABLE public.study_user_prefs
  ADD COLUMN IF NOT EXISTS nickname text;

CREATE UNIQUE INDEX IF NOT EXISTS study_user_prefs_nickname_lower_key
  ON public.study_user_prefs (lower(nickname))
  WHERE nickname IS NOT NULL;
