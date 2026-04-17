-- ============================================================
-- Allow admins to assign themselves custom roles
-- ============================================================
-- The original policies on user_roles blocked all self-modification
-- (`auth.uid() != user_id`). That over-applied the lockout-prevention
-- intent: the real concern is an admin accidentally revoking their
-- own admin role. Adding themselves to a new custom role is fine.
--
-- This migration:
--   - Relaxes INSERT/UPDATE to permit self-assignment for any role.
--   - Narrows DELETE so admins can only revoke their own admin role
--     if another admin still exists (or, more simply, cannot revoke
--     their own admin assignment at all — another admin must do it).
-- ============================================================

DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update role assignments" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can remove role assignments" ON public.user_roles;

-- INSERT: Admins can assign any role to any user, including themselves.
CREATE POLICY "Admins can assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    'admin' = ANY(public.get_user_roles(auth.uid()))
  );

-- UPDATE: Admins can update any role assignment.
CREATE POLICY "Admins can update role assignments"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles(auth.uid()))
  )
  WITH CHECK (
    'admin' = ANY(public.get_user_roles(auth.uid()))
  );

-- DELETE: Admins can remove role assignments, but cannot revoke their
-- own admin role — that must be done by another admin to prevent
-- self-lockout.
CREATE POLICY "Admins can remove role assignments"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND NOT (
      auth.uid() = user_id
      AND role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );
