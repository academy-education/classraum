-- Step 3 of the users.name split (docs/plans/name-split-plan.md §5.2).
-- APPLIED 2026-08-20. Actual results: a=202  b=51  c=150  c2=1  NULL=191.
--
-- ###################################################################
-- # THIS FILE CONTAINS THE ONLY DESTRUCTIVE STATEMENT IN THE CHANGE. #
-- ###################################################################
-- Statement (a) sets `name = r.n`, which UN-MASKS 167 users.name values.
-- Their masked originals ('김**') exist nowhere else once overwritten.
-- The snapshot table public.users_name_backup_20260820 is created INSIDE
-- this same transaction, before the UPDATE. Keep it for one full billing
-- cycle. Rollback is:
--   UPDATE public.users u SET name = b.name, family_name = NULL, given_name = NULL
--   FROM public.users_name_backup_20260820 b WHERE b.id = u.id;
--
-- The whole thing is one DO block, so it is one transaction: any RAISE
-- EXCEPTION below rolls back the snapshot, all four UPDATEs, and everything
-- else. Verified by running it once with exp_b deliberately set to 999 —
-- it raised 'statement (b) latin-2 affected 51 rows, expected 999' and left
-- family_name set on 0 rows, relation on 0 rows, 316 rows still masked, and
-- no snapshot table. The guard is not decorative.
--
-- TWO DEVIATIONS FROM THE PLAN'S §5.2 TEXT, both because the plan's SQL
-- contradicts the plan's own §1 analysis:
--
-- 1. 'development' added to statement (b)'s junk-exclusion regex. The plan's
--    §1 table classifies `Development User` as junk/NEEDS-REPROMPT, but its
--    §5.2 regex does not exclude it, so the statement matched 52 rows, not
--    the 51 the plan asserts. With 'development' excluded it matches exactly
--    51 and §1 and §5.2 finally agree.
--
-- 2. The round-trip assertion is SCRIPT-AWARE. The plan states it as
--    `family_name || given_name <> name`, which holds only for Korean rows;
--    Latin rows are stored given-space-family, so that assertion would have
--    reported all 51 Latin rows as broken. Korean joins with no separator,
--    Latin joins with a space.
--
-- Statement (c) deliberately leaves the 150 label parents' name columns NULL.
-- Their real names exist NOWHERE in the database and the child's surname is
-- not a safe guess (a Korean mother keeps her own 성). They get `relation`
-- and a re-prompt instead. `DoYeon's Mom` has no family_members row at all,
-- so (c2) touches 1 row, not 2 — that is why relation totals 151, not 152.

DO $BACKFILL$
DECLARE
  n_a int; n_b int; n_c int;
  exp_a CONSTANT int := 202;
  exp_b CONSTANT int := 51;
  exp_c CONSTANT int := 150;
  bad_join int; bad_null int; n_notnull int;
BEGIN
  -- ---- SNAPSHOT FIRST (plan §5.6). The ONLY destructive statement in this
  -- whole change is statement (a)'s `name = r.n`, which un-masks ~166
  -- users.name values whose masked originals exist nowhere else.
  DROP TABLE IF EXISTS public.users_name_backup_20260820;
  CREATE TABLE public.users_name_backup_20260820 AS
    SELECT id, name, family_name, given_name FROM public.users;

  IF (SELECT count(*) FROM public.users_name_backup_20260820) <> (SELECT count(*) FROM public.users) THEN
    RAISE EXCEPTION 'snapshot row count mismatch';
  END IF;

  -- ---- (a) Korean 3-syllable, resolved through auth metadata for masked rows.
  WITH resolved AS (
    SELECT u.id,
           btrim(CASE WHEN u.name LIKE '%*%'
                 THEN COALESCE(NULLIF(btrim(au.raw_user_meta_data->>'name'),''),
                               NULLIF(btrim(fm.user_name),''), u.name)
                 ELSE u.name END) AS n
    FROM public.users u
    LEFT JOIN auth.users au ON au.id = u.id
    LEFT JOIN LATERAL (SELECT user_name FROM public.family_members
                       WHERE user_id = u.id AND user_name <> '' LIMIT 1) fm ON true
  )
  UPDATE public.users u
  SET family_name = left(r.n,1),
      given_name  = substr(r.n,2),
      name        = r.n
  FROM resolved r
  WHERE r.id = u.id
    AND r.n ~ '^[가-힣]{3}$'
    AND r.n <> '다니엘';
  GET DIAGNOSTICS n_a = ROW_COUNT;

  -- ---- (b) Latin, exactly two tokens, stored Western order (given family).
  -- NOTE: 'development' added to the junk regex. The plan's §5.2 regex omits
  -- it, which contradicts the plan's own §1 table where `Development User` is
  -- classified junk/NEEDS-REPROMPT. Without it this statement matches 52.
  UPDATE public.users
  SET given_name  = split_part(btrim(name),' ',1),
      family_name = split_part(btrim(name),' ',2),
      name        = btrim(name)
  WHERE btrim(name) ~ '^[A-Za-z''-]+ +[A-Za-z''-]+$'
    AND btrim(name) !~* '(test|demo|e2e|development|john doe|kg inicis|parent bob|student (john|sarah)|teacher alice)'
    AND btrim(name) NOT IN ('DoYeon''s Mom','Papa Lynch');
  GET DIAGNOSTICS n_b = ROW_COUNT;

  -- ---- (c) relation from the label. NAME COLUMNS DELIBERATELY LEFT NULL:
  -- these 150 parents' real names exist nowhere in the database, and the
  -- child's surname is not a safe guess (a Korean mother keeps her own 성).
  UPDATE public.family_members fm
  SET relation = CASE WHEN a.n ~ '아버지$' THEN 'father' ELSE 'mother' END
  FROM (SELECT u.id, btrim(au.raw_user_meta_data->>'name') n
        FROM public.users u JOIN auth.users au ON au.id = u.id
        WHERE btrim(au.raw_user_meta_data->>'name') ~ '^[가-힣]+ +(아버지|어머니)$') a
  WHERE fm.user_id = a.id;
  GET DIAGNOSTICS n_c = ROW_COUNT;

  -- ---- (c2) the 2 English relationship labels, same treatment.
  UPDATE public.family_members fm
  SET relation = CASE WHEN u.name ILIKE '%mom%' THEN 'mother' ELSE 'father' END
  FROM public.users u
  WHERE fm.user_id = u.id AND btrim(u.name) IN ('DoYeon''s Mom','Papa Lynch');

  -- ================= ASSERTIONS. Any failure rolls the whole thing back. =====
  IF n_a <> exp_a THEN
    RAISE EXCEPTION 'statement (a) korean-3 affected % rows, expected %', n_a, exp_a;
  END IF;
  IF n_b <> exp_b THEN
    RAISE EXCEPTION 'statement (b) latin-2 affected % rows, expected %', n_b, exp_b;
  END IF;
  IF n_c <> exp_c THEN
    RAISE EXCEPTION 'statement (c) relation affected % rows, expected %', n_c, exp_c;
  END IF;

  -- users.name must never be NULL or blank.
  SELECT count(*) INTO bad_null FROM public.users WHERE name IS NULL OR btrim(name) = '';
  IF bad_null <> 0 THEN
    RAISE EXCEPTION 'users.name NULL/blank on % rows', bad_null;
  END IF;

  -- Round-trip invariant, SCRIPT-AWARE. The plan §5.2 states this as
  -- `family_name || given_name <> name`, which is only true for the Korean
  -- rows; it would report all 51 Latin rows as broken. Korean joins with no
  -- separator, Latin joins given-space-family.
  SELECT count(*) INTO bad_join FROM public.users
  WHERE family_name IS NOT NULL
    AND CASE WHEN family_name ~ '^[가-힣]+$'
             THEN family_name || given_name
             ELSE given_name || ' ' || family_name END <> name;
  IF bad_join <> 0 THEN
    RAISE EXCEPTION 'round-trip failed on % rows', bad_join;
  END IF;

  SELECT count(*) INTO n_notnull FROM public.users WHERE family_name IS NOT NULL;
  IF n_notnull <> exp_a + exp_b THEN
    RAISE EXCEPTION 'family_name NOT NULL on % rows, expected %', n_notnull, exp_a + exp_b;
  END IF;

  RAISE NOTICE 'OK a=% b=% c=% notnull=%', n_a, n_b, n_c, n_notnull;
END
$BACKFILL$;
