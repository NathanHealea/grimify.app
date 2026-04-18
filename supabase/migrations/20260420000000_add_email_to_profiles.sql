-- ============================================================
-- Add email column to profiles
-- Syncs email from auth.users into profiles so the admin user
-- list can display email without calling the Admin API per row.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add the column
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- ------------------------------------------------------------
-- 2. Backfill existing profiles from auth.users
-- ------------------------------------------------------------
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- ------------------------------------------------------------
-- 3. Update handle_new_user() to copy email on insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, has_setup_profile)
  VALUES (NEW.id, public.generate_profile_name(), NEW.email, false);
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4. Update handle_user_login() to also sync email on login
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, has_setup_profile)
  VALUES (NEW.id, public.generate_profile_name(), NEW.email, false)
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, public.generate_profile_name()),
        email        = EXCLUDED.email,
        updated_at   = now()
    WHERE public.profiles.display_name IS NULL
       OR public.profiles.email IS DISTINCT FROM EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 5. Trigger: keep email in sync when auth.users.email changes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email      = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Only create the trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_email_change'
  ) THEN
    CREATE TRIGGER on_auth_user_email_change
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW
      WHEN (OLD.email IS DISTINCT FROM NEW.email)
      EXECUTE FUNCTION public.handle_user_email_change();
  END IF;
END;
$$;
