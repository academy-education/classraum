-- 047: Nickname change-once lock for Classraum Study.
-- Applied to the live Supabase project via MCP as "study_nickname_change_lock".
-- This file captures the DDL so the schema is reproducible from the repo.
--
-- A nickname may be changed only ONCE after the initial pick. This flag is
-- set true the first time a non-null nickname is changed to a different
-- value; once true, the /api/study/nickname route rejects further changes.
-- The initial pick (NULL -> value) does not set it, so a brand-new user
-- still gets exactly one change after choosing.

ALTER TABLE public.study_user_prefs
  ADD COLUMN IF NOT EXISTS nickname_changed boolean NOT NULL DEFAULT false;
