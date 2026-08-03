-- 072: study_user_prefs.avatar_config — the customisable avatar.
--
-- NOT APPLIED. Written for review; do not run it from an agent session.
-- Run 071 first (it adds avatar_id, and this migration keeps that column).
--
--
-- WHY A SECOND COLUMN RATHER THAN REPLACING avatar_id
--
-- 071 stores `avatar_id`: one registry key naming a whole preset person.
-- That is the right shape for "pick one of eighteen" and the wrong shape for
-- "this skin tone with that hair and those glasses" — a key cannot express a
-- combination, and widening it into a delimited string (`s3.bob.black.gl`)
-- would be a schema pretending to be a parser. The format CHECK on avatar_id
-- allows 32 characters and no dots; it was never going to hold a composition.
--
-- So the two columns answer two different questions and BOTH are worth
-- keeping:
--
--   avatar_config  what the student's avatar actually looks like. The source
--                  of truth for rendering.
--   avatar_id      which preset they STARTED from, or NULL if they built
--                  from scratch. Not read by the renderer. Kept because it
--                  is the only way to learn which presets people reach for,
--                  and because a student who picked a preset and never
--                  customised should not be indistinguishable from one who
--                  hand-built the identical face.
--
-- Presets are therefore not a separate system from the builder: a preset IS
-- a config, and choosing one seeds the builder. Nobody faces a blank slate,
-- and the 18+ presets already authored keep earning their keep.
--
--
-- WHY jsonb WITH A SHAPE CHECK, NOT COLUMNS PER PART
--
-- The obvious alternative is skin_tone / hair_style / hair_colour /
-- accessory / top as five text columns. Rejected: every new part category
-- would then need a migration before the picker could offer it, and art
-- would ship in lockstep with schema for a cosmetic. The part VOCABULARY
-- belongs to the app registry, which is also the only place that knows what
-- it can actually draw.
--
-- Same layering as 071, for the same reason:
--
--   DB      shape only — an object, not an array/scalar, and bounded in size
--           so a client cannot park arbitrary documents in a cosmetics
--           column. Cheap, permanent, and it never needs to know part names.
--   API     membership — PUT /api/study/prefs rejects any key or value this
--           build cannot draw.
--   Client  degrades — an unknown part falls back to that category's
--           default, and an absent/!unreadable config falls back to the
--           deterministic INITIALS avatar, which is what a student who never
--           opened the builder already sees.
--
-- The floor stays "initials", never "blank", at every layer — including for
-- a config written by a future build with parts this one has retired.
--
--
-- NULL IS THE DEFAULT AND MUST STAY THAT WAY
--
-- No DEFAULT clause, deliberately — the same trap 071 guards. A default
-- config would silently opt every existing student into one identical face
-- on deploy day, and destroy the initials fallback for all of them at once.
-- The assertion below fails the migration if a DEFAULT is ever added here,
-- because that change would be one word in review and instant in production.

begin;

create temporary table _072_before on commit drop as
  select count(*) as n from public.study_user_prefs;

alter table public.study_user_prefs
  add column if not exists avatar_config jsonb;

-- Shape only. See the header for why this does not enumerate part names.
-- 2 KB is far above any real config (7 short keys) and far below a payload
-- worth worrying about.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.study_user_prefs'::regclass
       and conname  = 'study_user_prefs_avatar_config_shape'
  ) then
    alter table public.study_user_prefs
      add constraint study_user_prefs_avatar_config_shape
      check (
        avatar_config is null
        or (jsonb_typeof(avatar_config) = 'object'
            and length(avatar_config::text) <= 2048)
      );
  end if;
end $$;

comment on column public.study_user_prefs.avatar_config is
  'The student''s customised avatar, as {skin, face, eyes, hair, hairColor, accessory, top} using part keys from src/app/mobile/study/_shared/avatars.tsx. THE SOURCE OF TRUTH FOR RENDERING. NULL = never opened the builder, and NULL is what makes the friends list and league leaderboard draw the deterministic initials avatar — never give this column a DEFAULT. The CHECK constrains SHAPE only; which part keys actually render is the app registry''s call, and an unknown part degrades to that category''s default rather than blanking the avatar. No image is stored or uploaded.';

comment on column public.study_user_prefs.avatar_id is
  'Which PRESET the student started from, or NULL if they built from scratch. NOT read by the renderer — avatar_config is. Kept so preset popularity is answerable, and so "picked a preset" stays distinguishable from "hand-built the same face". Added in 071, demoted to this role in 072.';

-- ── Assertions: abort rather than leave a half-applied cosmetic ────────
do $$
declare
  before_n bigint; after_n bigint;
  defaulted text; nullable text; bad int;
begin
  select n into before_n from _072_before;
  select count(*) into after_n from public.study_user_prefs;
  if before_n <> after_n then
    raise exception
      '072 changed the row count of study_user_prefs (% -> %). Adding a nullable column must not touch rows.',
      before_n, after_n;
  end if;

  select column_default, c.is_nullable into defaulted, nullable
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name   = 'study_user_prefs'
     and c.column_name  = 'avatar_config';
  if not found then
    raise exception '072 did not create study_user_prefs.avatar_config.';
  end if;

  if defaulted is not null then
    raise exception
      'study_user_prefs.avatar_config has DEFAULT %. It must have none — NULL is how a student who never opened the builder keeps their initials avatar.',
      defaulted;
  end if;
  if nullable <> 'YES' then
    raise exception
      'study_user_prefs.avatar_config must be nullable — NULL is the "never customised" signal the fallback depends on.';
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.study_user_prefs'::regclass
       and conname  = 'study_user_prefs_avatar_config_shape'
       and convalidated
  ) then
    raise exception
      'study_user_prefs_avatar_config_shape is missing or NOT VALID — the shape guarantee this column relies on is not in force.';
  end if;

  -- Proves the constraint holds over data present at apply time, not just
  -- that it exists.
  select count(*) into bad
    from public.study_user_prefs
   where avatar_config is not null
     and (jsonb_typeof(avatar_config) <> 'object'
          or length(avatar_config::text) > 2048);
  if bad > 0 then
    raise exception
      '% row(s) hold a malformed avatar_config. Repair them before this constraint is relied on.', bad;
  end if;
end $$;

commit;


-- ── Verify after applying ─────────────────────────────────────────────
-- Expect customised = 0 immediately after apply, has_default = f, nullable = YES.
--
--   select
--     count(*)                                          as rows,
--     count(*) filter (where avatar_config is not null) as customised,
--     count(*) filter (where avatar_id is not null)     as started_from_preset
--   from public.study_user_prefs;
--
--   select column_default is not null as has_default, is_nullable
--     from information_schema.columns
--    where table_schema='public' and table_name='study_user_prefs'
--      and column_name='avatar_config';
--
-- Which presets people actually start from (a set where one id dominates
-- means the builder's first tile is doing the choosing, not the student):
--
--   select avatar_id, count(*) from public.study_user_prefs
--    where avatar_id is not null group by 1 order by 2 desc;
--
-- Part popularity, e.g. skin tone — a distribution collapsed onto one value
-- is the "everyone looks the same" failure a builder is prone to:
--
--   select avatar_config->>'skin' as skin, count(*)
--     from public.study_user_prefs
--    where avatar_config is not null group by 1 order by 2 desc;
