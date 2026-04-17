-- ============================================================
-- Admin profile operations
-- Adds the RLS and RPC surface needed for admins to edit and
-- delete user accounts from the admin dashboard.
-- ============================================================

-- ------------------------------------------------------------
-- RLS: admins can update any profile
-- ------------------------------------------------------------
-- Complements the existing "Users can update their own profile"
-- policy so admins can edit display_name / bio for other users.
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ------------------------------------------------------------
-- RPC: admin_delete_user
-- ------------------------------------------------------------
-- Deletes an account from auth.users (which cascades to profiles
-- and user_roles). SECURITY DEFINER so it can touch auth.users;
-- the body re-verifies that the caller holds the admin role and
-- is not trying to delete themselves.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF NOT ('admin' = ANY(public.get_user_roles(auth.uid()))) THEN
    RAISE EXCEPTION 'Only admins can delete users.';
  END IF;

  IF auth.uid() = target_id THEN
    RAISE EXCEPTION 'Admins cannot delete their own account.';
  END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

-- Only authenticated users may call the RPC; the body enforces admin-only.
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
