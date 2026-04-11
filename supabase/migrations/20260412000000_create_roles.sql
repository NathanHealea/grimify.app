-- ============================================================
-- Create roles and user_roles tables
-- ============================================================

-- Roles table: stores available role names
CREATE TABLE public.roles (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

-- Seed the two launch roles
INSERT INTO public.roles (name) VALUES ('user'), ('admin');

-- User-roles junction table: many-to-many between profiles and roles
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id int NOT NULL REFERENCES public.roles (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- Helper function: get_user_roles
-- Returns an array of role name strings for a given user UUID.
-- Used by RLS policies and application code.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(r.name), '{}')
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = user_uuid;
$$;

-- ============================================================
-- Row Level Security: roles table
-- ============================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read roles
CREATE POLICY "Authenticated users can view roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies — roles are managed via migrations only

-- ============================================================
-- Row Level Security: user_roles table
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read role assignments
CREATE POLICY "Authenticated users can view user roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only admins can assign roles, and not to themselves
CREATE POLICY "Admins can assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND auth.uid() != user_id
  );

-- UPDATE: Only admins can update role assignments, and not their own
CREATE POLICY "Admins can update role assignments"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND auth.uid() != user_id
  )
  WITH CHECK (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND auth.uid() != user_id
  );

-- DELETE: Only admins can remove role assignments, and not their own
CREATE POLICY "Admins can remove role assignments"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND auth.uid() != user_id
  );

-- ============================================================
-- Trigger: auto-assign "user" role on profile creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM public.roles r
  WHERE r.name = 'user';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_role();

-- ============================================================
-- Backfill: assign "user" role to existing profiles
-- ============================================================
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE r.name = 'user'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- ============================================================
-- Trigger: prevent deletion of the "user" role from any account
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_user_role_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.roles WHERE id = OLD.role_id AND name = 'user'
  ) THEN
    RAISE EXCEPTION 'The "user" role cannot be removed from any account.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_user_role_delete_prevent_user
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_role_deletion();
