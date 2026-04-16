-- Extract a display name from OAuth provider metadata.
-- Returns NULL when no usable name is found, signaling the caller to fall back.
CREATE OR REPLACE FUNCTION public.extract_oauth_display_name(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(meta ->> 'full_name'), ''),
    NULLIF(TRIM(meta ->> 'name'), ''),
    NULLIF(TRIM(meta ->> 'custom_username'), ''),
    NULLIF(TRIM(meta ->> 'preferred_username'), ''),
    NULLIF(TRIM(meta ->> 'user_name'), '')
  );
$$;

-- Replace handle_new_user() to prefer OAuth display name over generated name.
-- Falls back to generate_profile_name() on unique_violation or missing metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  oauth_name text;
BEGIN
  oauth_name := public.extract_oauth_display_name(NEW.raw_user_meta_data);

  -- Use the OAuth name if available and not already taken
  IF oauth_name IS NOT NULL THEN
    BEGIN
      INSERT INTO public.profiles (id, display_name, has_setup_profile)
      VALUES (NEW.id, oauth_name, false);
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      -- Name already taken — fall through to generated name
      NULL;
    END;
  END IF;

  -- Fallback: auto-generated name
  INSERT INTO public.profiles (id, display_name, has_setup_profile)
  VALUES (NEW.id, public.generate_profile_name(), false);

  RETURN NEW;
END;
$$;

-- Replace handle_user_login() to prefer OAuth display name for new profiles.
-- Existing profiles with a display_name are never overwritten.
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  oauth_name text;
  chosen_name text;
BEGIN
  oauth_name := public.extract_oauth_display_name(NEW.raw_user_meta_data);
  chosen_name := COALESCE(oauth_name, public.generate_profile_name());

  INSERT INTO public.profiles (id, display_name, has_setup_profile)
  VALUES (NEW.id, chosen_name, false)
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, chosen_name),
        updated_at = now()
    WHERE public.profiles.display_name IS NULL;

  RETURN NEW;
END;
$$;
