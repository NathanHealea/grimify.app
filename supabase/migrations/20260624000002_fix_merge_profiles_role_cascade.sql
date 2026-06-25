-- Fix: merge_profiles fails because the prevent_user_role_deletion trigger fires
-- when the source profile's user_roles rows are cascade-deleted.
-- Solution: set a session-local flag inside merge_profiles so the trigger can
-- distinguish a merge-driven cascade from a direct admin deletion.

CREATE OR REPLACE FUNCTION public.prevent_user_role_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Allow cascade deletion triggered by a profile merge operation.
  IF current_setting('app.skip_role_guard', true) = 'true' THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.roles WHERE id = OLD.role_id AND name = 'user'
  ) THEN
    RAISE EXCEPTION 'The "user" role cannot be removed from any account.';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_profiles(source_uuid uuid, target_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  roles_moved integer := 0;
  source_profile public.profiles%ROWTYPE;
  target_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO source_profile FROM public.profiles WHERE id = source_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source profile not found'; END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = target_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target profile not found'; END IF;

  IF source_uuid = target_uuid THEN RAISE EXCEPTION 'Cannot merge a profile into itself'; END IF;

  INSERT INTO public.user_roles (user_id, role_id, assigned_at)
    SELECT target_uuid, role_id, assigned_at
    FROM public.user_roles WHERE user_id = source_uuid
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS roles_moved = ROW_COUNT;

  UPDATE public.profiles SET
    bio = COALESCE(target_profile.bio, source_profile.bio),
    avatar_url = COALESCE(target_profile.avatar_url, source_profile.avatar_url),
    updated_at = now()
  WHERE id = target_uuid;

  -- Signal the role-guard trigger that this deletion is from a merge operation
  -- so it allows the source user's 'user' role to be cascade-deleted.
  PERFORM set_config('app.skip_role_guard', 'true', true);
  DELETE FROM public.profiles WHERE id = source_uuid;

  RETURN jsonb_build_object(
    'roles_moved', roles_moved,
    'source_deleted', true
  );
END;
$$;
