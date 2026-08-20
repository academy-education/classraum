-- Step 4 of the users.name split (docs/plans/name-split-plan.md §5.3).
-- Extends public.handle_new_user() to accept family_name/given_name from
-- raw_user_meta_data. Diff this against 091, which is the verbatim baseline.
--
-- WHAT CHANGED, and nothing else:
--   * three new DECLAREs (v_family, v_given, v_name)
--   * a block computing them before the users INSERT
--   * the users INSERT now also writes family_name, given_name,
--     name_confirmed_at
-- Every other line is byte-identical to 091.
--
-- DESIGN NOTES
--
-- 1. A HALF SPLIT IS NEVER STORED. If only one of the two keys arrives, both
--    columns are left NULL and the account joins the re-prompt cohort. A row
--    with family_name set and given_name NULL would satisfy "family_name IS
--    NOT NULL" — the exact predicate the re-prompt keys off — and would
--    therefore never be asked to fix itself.
--
-- 2. THE JOIN IS SCRIPT-AWARE and must stay in lockstep with joinName() in
--    src/lib/name.ts. Korean concatenates with no separator; Latin is
--    "given family". Getting this wrong here produces a users.name that
--    disagrees with what the app displays.
--
-- 3. name_confirmed_at is set only when the user actually typed both halves,
--    i.e. came through the new two-field form. It suppresses the re-prompt.
--
-- 4. OLD-SHAPE SIGNUPS STILL WORK UNCHANGED. A signup carrying only `name`
--    (every pre-deploy client, the CSV importer, any cached JS bundle) takes
--    exactly the 091 path: name := COALESCE(meta.name, email), both split
--    columns NULL. It is deliberately NOT auto-split here — guessing at
--    signup is what produced the 150 wrong parent records in the first place.
--
-- 5. THE FUNCTION STILL SWALLOWS EVERY ERROR (EXCEPTION WHEN OTHERS ->
--    RAISE WARNING). A mistake in this file does NOT fail the signup; it
--    silently yields a user with no name, or no public.users row at all.
--    This was verified by INSERTing real auth.users rows and asserting the
--    resulting public.users row CONTENTS, never by checking that the insert
--    returned success.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  academy_id_param UUID;
  family_id_param UUID;
  user_exists BOOLEAN;
  v_family TEXT;
  v_given  TEXT;
  v_name   TEXT;
BEGIN
  -- Check if user already exists in our users table
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;

  -- If user already exists, skip processing
  IF user_exists THEN
    RETURN NEW;
  END IF;

  -- Extract role, academy_id, and family_id from user metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Safely convert academy_id, handle potential null/invalid UUID
  BEGIN
    academy_id_param := (NEW.raw_user_meta_data->>'academy_id')::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      academy_id_param := NULL;
  END;

  -- Safely convert family_id, handle potential null/invalid UUID
  BEGIN
    family_id_param := (NEW.raw_user_meta_data->>'family_id')::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      family_id_param := NULL;
  END;

  -- 성/이름 from the new two-field form, when the client sends them.
  v_family := NULLIF(btrim(NEW.raw_user_meta_data->>'family_name'), '');
  v_given  := NULLIF(btrim(NEW.raw_user_meta_data->>'given_name'), '');
  v_name   := NULLIF(btrim(NEW.raw_user_meta_data->>'name'), '');

  IF v_family IS NOT NULL AND v_given IS NOT NULL THEN
    -- Script-aware join; must match joinName() in src/lib/name.ts.
    IF v_family ~ '[가-힣]' THEN
      v_name := v_family || v_given;
    ELSE
      v_name := v_given || ' ' || v_family;
    END IF;
  ELSE
    -- Never store a half split: it would look "already migrated" to the
    -- re-prompt predicate and the row would never get fixed.
    v_family := NULL;
    v_given  := NULL;
  END IF;

  -- Insert into users table (phone included so academy-less study
  -- signups keep their contact number somewhere queryable)
  INSERT INTO public.users (id, email, name, role, phone, family_name, given_name, name_confirmed_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(v_name, NEW.email),
    user_role,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    v_family,
    v_given,
    CASE WHEN v_family IS NOT NULL THEN now() ELSE NULL END
  );

  -- Create role-specific entry if academy_id is provided and valid
  IF academy_id_param IS NOT NULL THEN
    -- Verify academy exists before creating role entry
    IF EXISTS(SELECT 1 FROM public.academies WHERE id = academy_id_param) THEN
      CASE user_role
        WHEN 'manager' THEN
          INSERT INTO public.managers (user_id, academy_id, phone)
          VALUES (
            NEW.id,
            academy_id_param,
            NEW.raw_user_meta_data->>'phone'
          );

        WHEN 'teacher' THEN
          INSERT INTO public.teachers (user_id, academy_id, phone)
          VALUES (
            NEW.id,
            academy_id_param,
            NEW.raw_user_meta_data->>'phone'
          );

        WHEN 'parent' THEN
          INSERT INTO public.parents (user_id, academy_id, phone)
          VALUES (
            NEW.id,
            academy_id_param,
            NEW.raw_user_meta_data->>'phone'
          );

        WHEN 'student' THEN
          INSERT INTO public.students (user_id, academy_id, phone, school_name)
          VALUES (
            NEW.id,
            academy_id_param,
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'school_name'
          );
      END CASE;
    END IF;
  END IF;

  -- Handle family association if family_id is provided
  IF family_id_param IS NOT NULL THEN
    -- Verify family exists and belongs to the same academy before creating family association
    IF EXISTS(
      SELECT 1 FROM public.families
      WHERE id = family_id_param
      AND (academy_id_param IS NULL OR academy_id = academy_id_param)
    ) THEN
      -- Only allow student or parent roles in families
      IF user_role IN ('student', 'parent') THEN
        INSERT INTO public.family_members (user_id, family_id, role)
        VALUES (NEW.id, family_id_param, user_role)
        ON CONFLICT (user_id, family_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Create default user preferences (use INSERT ... ON CONFLICT to avoid duplicates)
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$;
