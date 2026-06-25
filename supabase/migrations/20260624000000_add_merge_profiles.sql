CREATE OR REPLACE FUNCTION public.merge_preview(source_uuid uuid, target_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
  source_profile public.profiles%ROWTYPE;
  target_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO source_profile FROM public.profiles WHERE id = source_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source profile not found'; END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = target_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target profile not found'; END IF;

  IF source_uuid = target_uuid THEN RAISE EXCEPTION 'Cannot merge a profile into itself'; END IF;

  SELECT jsonb_build_object(
    'source_display_name', source_profile.display_name,
    'target_display_name', target_profile.display_name,
    'roles_to_transfer', (
      SELECT count(*) FROM public.user_roles ur
      WHERE ur.user_id = source_uuid
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = target_uuid AND ur2.role_id = ur.role_id
        )
    ),
    'will_copy_bio', (source_profile.bio IS NOT NULL AND target_profile.bio IS NULL),
    'will_copy_avatar', (source_profile.avatar_url IS NOT NULL AND target_profile.avatar_url IS NULL)
  ) INTO result;

  RETURN result;
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

  DELETE FROM public.profiles WHERE id = source_uuid;

  RETURN jsonb_build_object(
    'roles_moved', roles_moved,
    'source_deleted', true
  );
END;
$$;
