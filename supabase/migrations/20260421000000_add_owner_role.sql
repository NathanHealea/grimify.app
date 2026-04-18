-- ============================================================
-- Add owner role
-- Introduces an 'owner' built-in role that is more privileged
-- than 'admin'. Admins cannot edit, deactivate, or delete any
-- account that holds the owner role. The owner protection is
-- enforced both at the application layer and in this RPC.
-- ============================================================

-- Insert the owner role as builtin (builtin column added in 20260418)
INSERT INTO public.roles (name, builtin)
VALUES ('owner', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Update admin_delete_user RPC to block owner deletion
-- ============================================================
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

  IF 'owner' = ANY(public.get_user_roles(target_id)) THEN
    RAISE EXCEPTION 'The owner account cannot be deleted.';
  END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
