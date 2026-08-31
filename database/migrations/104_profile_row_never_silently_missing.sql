-- 104: handle_new_user must not swallow the failure that matters.
--
--
-- THE BUG, REPRODUCED
--
-- public.users.email and .name are both NOT NULL. Kakao sign-in can
-- return an account with NO email. The trigger inserted NEW.email
-- straight into that column, the NOT NULL violation raised, and the
-- function's blanket handler caught it:
--
--   EXCEPTION WHEN OTHERS THEN
--     RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
--     RETURN NEW;
--
-- Probed on 2026-08-29 with an emailless auth user:
--   auth_user_created 1, profile_row_created 0, prefs_created 0
--
-- The account exists and can sign in. Nothing else works, because every
-- query in the app keys off public.users. The repair route 409s. It is
-- a dead end that looks like a successful signup.
--
--
-- WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT
--
-- Two separate faults were in play and only one of them is the
-- swallowing:
--
--   1. The users row could not be built at all from an emailless
--      account. Fixed with explicit fallbacks — a placeholder address
--      derived from the uid, and the provider name (or 'User') for the
--      display name. A placeholder is honest here: the row exists, the
--      address is obviously not real, and the app can prompt for one.
--
--   2. The blanket handler makes EVERY failure quiet, including this
--      one. The profile insert is now OUTSIDE it: if that fails the
--      signup fails loudly, which is correct, because an account
--      without a profile row is not a usable account.
--
-- The optional work — academy links, family links, preferences — STAYS
-- inside a tolerant block. Those failing should not destroy a signup,
-- and they are all repairable afterwards. That distinction is the point:
-- the handler was wrong not because it existed but because it covered
-- the one insert that must never fail silently.

begin;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  user_role TEXT;
  academy_id_param UUID;
  family_id_param UUID;
  user_exists BOOLEAN;
  v_family TEXT;
  v_given  TEXT;
  v_name   TEXT;
  v_email  TEXT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
  IF user_exists THEN
    RETURN NEW;
  END IF;

  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  v_family := NULLIF(btrim(NEW.raw_user_meta_data->>'family_name'), '');
  v_given  := NULLIF(btrim(NEW.raw_user_meta_data->>'given_name'), '');
  v_name   := NULLIF(btrim(NEW.raw_user_meta_data->>'name'), '');

  IF v_family IS NOT NULL AND v_given IS NOT NULL THEN
    IF v_family ~ '[가-힣]' THEN
      v_name := v_family || v_given;
    ELSE
      v_name := v_given || ' ' || v_family;
    END IF;
  ELSE
    v_family := NULL;
    v_given  := NULL;
  END IF;

  -- A provider that returns no email (Kakao, and Apple's hide-my-email
  -- when the relay is withheld) must still produce a row. The address is
  -- deliberately in an unroutable .invalid domain so nothing mistakes it
  -- for a real one and it can be detected for a "please add your email"
  -- prompt.
  v_email := COALESCE(NULLIF(btrim(NEW.email), ''), NEW.id::text || '@no-email.invalid');
  v_name  := COALESCE(v_name, NULLIF(btrim(NEW.email), ''), 'User');

  -- OUTSIDE the tolerant block on purpose. If this fails, the signup
  -- must fail; an account with no profile row is not a usable account.
  INSERT INTO public.users (id, email, name, role, phone, family_name, given_name, name_confirmed_at)
  VALUES (
    NEW.id, v_email, v_name, user_role,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    v_family, v_given,
    CASE WHEN v_family IS NOT NULL THEN now() ELSE NULL END
  );

  -- Everything below is best-effort and stays tolerant: a missing
  -- academy link or preference row is repairable, and none of it should
  -- cost the user their account.
  BEGIN
    BEGIN
      academy_id_param := (NEW.raw_user_meta_data->>'academy_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN academy_id_param := NULL;
    END;
    BEGIN
      family_id_param := (NEW.raw_user_meta_data->>'family_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN family_id_param := NULL;
    END;

    IF academy_id_param IS NOT NULL
       AND EXISTS(SELECT 1 FROM public.academies WHERE id = academy_id_param) THEN
      CASE user_role
        WHEN 'manager' THEN
          INSERT INTO public.managers (user_id, academy_id, phone)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone');
        WHEN 'teacher' THEN
          INSERT INTO public.teachers (user_id, academy_id, phone)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone');
        WHEN 'parent' THEN
          INSERT INTO public.parents (user_id, academy_id, phone)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone');
        WHEN 'student' THEN
          INSERT INTO public.students (user_id, academy_id, phone, school_name)
          VALUES (NEW.id, academy_id_param, NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'school_name');
        ELSE NULL;
      END CASE;
    END IF;

    IF family_id_param IS NOT NULL
       AND user_role IN ('student', 'parent')
       AND EXISTS(SELECT 1 FROM public.families
                  WHERE id = family_id_param
                    AND (academy_id_param IS NULL OR academy_id = academy_id_param)) THEN
      INSERT INTO public.family_members (user_id, family_id, role)
      VALUES (NEW.id, family_id_param, user_role)
      ON CONFLICT (user_id, family_id) DO NOTHING;
    END IF;

    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: optional linking failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

commit;
