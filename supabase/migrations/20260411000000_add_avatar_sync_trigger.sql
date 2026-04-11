-- Sync avatar_url from OAuth provider metadata on profile creation
--
-- Reads the avatar_url from auth.users.raw_user_meta_data when a new
-- profile row is inserted. Never overwrites a user-set avatar (non-null).
-- Uses SECURITY DEFINER to access auth.users which RLS would block.

CREATE OR REPLACE FUNCTION public.sync_avatar_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta_avatar text;
BEGIN
  -- Never overwrite a user-set avatar
  IF NEW.avatar_url IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Read avatar_url from the OAuth provider's user metadata
  SELECT raw_user_meta_data ->> 'avatar_url'
    INTO meta_avatar
    FROM auth.users
   WHERE id = NEW.id;

  IF meta_avatar IS NOT NULL AND meta_avatar <> '' THEN
    NEW.avatar_url := meta_avatar;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_sync_avatar
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_avatar_from_auth();
