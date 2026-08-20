-- Step 0 of the users.name split (docs/plans/name-split-plan.md §5.3, §5.5).
--
-- public.handle_new_user() has been live in production since the project
-- began and is NOT in database/migrations/. It exists in the repo only as
-- two comments (src/app/auth/page.tsx, src/app/api/onboarding/[token]/route.ts).
-- This file commits it VERBATIM, exactly as pg_get_functiondef() returned it
-- on 2026-08-20, with NO behaviour change whatsoever.
--
-- Why this file exists before any other step: every later step needs to be
-- diffable against a known baseline, and 092 replaces this function. Without
-- this file there is nothing to diff against and nothing to roll back to.
--
-- Note for anyone editing the function later: it ends in
--   EXCEPTION WHEN OTHERS THEN RAISE WARNING ... RETURN NEW;
-- so a mistake here does NOT fail the signup. It silently produces a user
-- row with no name, or no user row at all. Test any change by asserting the
-- resulting public.users row contents, never by checking that signup
-- returned success.
--
-- The trigger binding (unchanged, restated for completeness):
--   CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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

  -- Insert into users table (phone included so academy-less study
  -- signups keep their contact number somewhere queryable)
  INSERT INTO public.users (id, email, name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    user_role,
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
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
