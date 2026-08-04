-- 071: study_user_prefs.avatar_id — the student's chosen Raumi avatar.
--
-- NOT APPLIED. Written for review; do not run it from an agent session.
--
--
-- WHY THIS COLUMN, HERE
--
-- study_user_prefs is already the per-student study identity row: it owns
-- `nickname` (the public handle shown on leaderboards) and
-- `nickname_changed`. The avatar is the same kind of fact — a display
-- choice, one per student, read by exactly the surfaces that read the
-- nickname (src/lib/study/identity.ts, the league leaderboard, the friends
-- list). Putting it anywhere else would mean a second lookup on every
-- leaderboard render for a single short string.
--
-- Explicitly NOT users.avatar_url and NOT user_conversations.avatar_url.
-- The latter belongs to the messaging system and is a URL to an uploaded
-- image; this is a registry key, no storage, no upload, no moderation
-- surface. Reusing that column would have coupled study cosmetics to the
-- messaging feature's lifecycle.
--
--
-- WHY text + A FORMAT CHECK, NOT AN ENUM AND NOT A LIST OF IDS
--
-- The tempting version of this constraint is
--   check (avatar_id in ('raumi-classic', 'raumi-scholar', ...))
-- and it is the wrong shape, for the same reason readiness is not a column
-- (see migration 070): a stored value cannot survive a change to the set
-- that defines it.
--
--   * Adding an avatar would need a migration to widen the constraint
--     before the picker could offer it — art and schema deploying in
--     lockstep, for a cosmetic.
--   * RETIRING one is worse. Drop it from the app registry and the DB
--     check still passes, so rows keep the id, and the client — which no
--     longer has a drawing — renders an empty circle. The constraint would
--     be enforcing a set that had already stopped being true.
--
-- So the layers are split by what each can actually guarantee:
--
--   DB      format only (`^[a-z][a-z0-9-]{1,31}$`) — cheap, permanent,
--           and enough to keep junk out of a column that is interpolated
--           into no SQL but is echoed to other students' browsers.
--   API     membership — PUT /api/study/prefs rejects any id this build
--           cannot draw (src/lib/study/avatars.ts::isStudyAvatarId).
--   Client  degrades — an id it does not recognise falls back to the
--           initials avatar, which is what a student with NULL sees.
--
-- The floor is therefore "initials", never "blank", at every layer.
--
--
-- NULL IS THE DEFAULT AND MUST STAY THAT WAY
--
-- No DEFAULT clause, deliberately. Every existing row stays NULL, and NULL
-- is the signal that makes the friends list and the league leaderboard draw
-- the deterministic initials avatar they have always drawn. A default of
-- 'raumi-classic' would have silently opted in every existing student and
-- made the whole set look identical on day one — and the assertion below
-- exists to catch exactly that, because a DEFAULT added here would be
-- invisible in review and instant in production.

begin;

-- Row count before, so the assertions can prove nothing was lost. A temp
-- table (not a variable) because the ALTER sits between capture and check.
create temporary table _071_before on commit drop as
  select count(*) as n from public.study_user_prefs;

alter table public.study_user_prefs
  add column if not exists avatar_id text;

-- Format-only constraint; see the header for why it is not a list of ids.
-- NOT VALID is not used: the column is empty on first run, and on a re-run
-- every existing value was written through the API's stricter membership
-- check, so a full validation scan is both cheap and meaningful.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.study_user_prefs'::regclass
       and conname  = 'study_user_prefs_avatar_id_format'
  ) then
    alter table public.study_user_prefs
      add constraint study_user_prefs_avatar_id_format
      check (avatar_id is null or avatar_id ~ '^[a-z][a-z0-9-]{1,31}$');
  end if;
end $$;

comment on column public.study_user_prefs.avatar_id is
  'The student''s chosen study avatar, as a registry key from src/lib/study/avatars.ts (e.g. ''raumi-classic''). NULL = never picked one, and NULL is what makes the friends list and league leaderboard draw the deterministic initials avatar instead — never give this column a DEFAULT. The CHECK constrains FORMAT only; which ids actually render is the app registry''s call, and an id the client cannot draw degrades to the initials avatar. No image is stored or uploaded: the avatars are inline SVG in src/app/mobile/study/_shared/avatars.tsx.';

-- ── Assertions: abort rather than leave a half-applied cosmetic ────────
do $$
declare
  before_n bigint;
  after_n  bigint;
  defaulted text;
  is_nullable text;
  bad int;
begin
  select n into before_n from _071_before;
  select count(*) into after_n from public.study_user_prefs;
  if before_n <> after_n then
    raise exception
      '071 changed the row count of study_user_prefs (% -> %). Adding a nullable column must not touch rows.',
      before_n, after_n;
  end if;

  select column_default, c.is_nullable into defaulted, is_nullable
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name   = 'study_user_prefs'
     and c.column_name  = 'avatar_id';

  if not found then
    raise exception '071 did not create study_user_prefs.avatar_id.';
  end if;

  -- A DEFAULT or a NOT NULL here would opt every existing student into an
  -- avatar and destroy the initials fallback for all of them at once.
  if defaulted is not null then
    raise exception
      'study_user_prefs.avatar_id has DEFAULT %. It must have none — NULL is how a student who never picked an avatar keeps their initials avatar.',
      defaulted;
  end if;
  if is_nullable <> 'YES' then
    raise exception
      'study_user_prefs.avatar_id must be nullable — NULL is the "no avatar chosen" signal the fallback depends on.';
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.study_user_prefs'::regclass
       and conname  = 'study_user_prefs_avatar_id_format'
       and convalidated
  ) then
    raise exception
      'study_user_prefs_avatar_id_format is missing or NOT VALID — the format guarantee this column relies on is not in force.';
  end if;

  -- Belt and braces: the constraint above is the guarantee, this proves it
  -- actually holds over the data present at apply time.
  select count(*) into bad
    from public.study_user_prefs
   where avatar_id is not null
     and avatar_id !~ '^[a-z][a-z0-9-]{1,31}$';
  if bad > 0 then
    raise exception
      '% row(s) hold a malformed avatar_id. Repair them before this constraint is relied on.', bad;
  end if;
end $$;

commit;


-- ── Verify after applying ─────────────────────────────────────────────
-- Expect: chosen = 0 immediately after apply (nobody has picked yet),
-- has_default = f, nullable = YES.
--
--   select
--     count(*) filter (where avatar_id is not null) as chosen,
--     count(*)                                      as rows
--   from public.study_user_prefs;
--
--   select column_default is not null as has_default, is_nullable
--     from information_schema.columns
--    where table_schema='public' and table_name='study_user_prefs'
--      and column_name='avatar_id';
--
-- Distribution once students start picking (a set where one id dominates
-- is a sign the picker's first tile is doing all the work, not a
-- preference):
--
--   select avatar_id, count(*) from public.study_user_prefs
--    where avatar_id is not null group by 1 order by 2 desc;
--
-- Ids present in the DB that this build can no longer draw — these render
-- as the initials avatar, which is correct, but a non-zero count means a
-- retired avatar is still stored and the picker should be checked:
--
--   select avatar_id, count(*) from public.study_user_prefs
--    where avatar_id is not null
--      and avatar_id not in (
--        'raumi-classic','raumi-scholar','raumi-sunny','raumi-mint',
--        'raumi-berry','raumi-violet','raumi-midnight','raumi-cobalt',
--        'raumi-coral','raumi-frost')
--    group by 1;
