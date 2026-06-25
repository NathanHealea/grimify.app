CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF 'admin' = ANY(public.get_user_roles(auth.uid())) THEN
    RAISE EXCEPTION 'Admin accounts cannot be self-deleted. Remove your admin role first.';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
