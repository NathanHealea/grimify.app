-- ============================================================
-- Fix roles.id type: integer → uuid
-- ============================================================
-- The remote database was provisioned with a pre-migration schema
-- that used serial integer PKs for the roles table. All local
-- migrations and application code assume uuid. This migration:
--   1. Saves existing role assignments (by role name)
--   2. Drops roles and user_roles (and their triggers / policies)
--   3. Recreates both tables with uuid PKs
--   4. Re-seeds roles and restores saved assignments
--   5. Re-enables RLS and recreates all policies and triggers
-- ============================================================

-- 1. Capture existing user → role mappings before dropping tables
CREATE TEMP TABLE _saved_user_roles AS
SELECT ur.user_id, r.name AS role_name
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id;

-- 2. Drop old tables (cascades to their triggers and RLS policies)
DROP TABLE public.user_roles;
DROP TABLE public.roles;

-- ============================================================
-- 3. Recreate roles with uuid PK
-- ============================================================
CREATE TABLE public.roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name    text UNIQUE NOT NULL,
  builtin boolean NOT NULL DEFAULT false
);

-- 4. Seed built-in roles
INSERT INTO public.roles (name, builtin)
VALUES ('user', true), ('admin', true), ('owner', true);

-- ============================================================
-- 5. Recreate user_roles with uuid FK
-- ============================================================
CREATE TABLE public.user_roles (
  user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES public.roles (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- 6. Restore saved assignments
INSERT INTO public.user_roles (user_id, role_id)
SELECT s.user_id, r.id
FROM _saved_user_roles s
JOIN public.roles r ON r.name = s.role_name;

-- ============================================================
-- 7. Helper function: get_user_roles
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
-- 8. Re-enable RLS
-- ============================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS policies — roles
-- ============================================================
CREATE POLICY "Authenticated users can view roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create roles"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update roles"
  ON public.roles FOR UPDATE TO authenticated
  USING  ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete roles"
  ON public.roles FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- 10. RLS policies — user_roles
-- ============================================================
CREATE POLICY "Authenticated users can view user roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Admins can assign any role to any user, including themselves
CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update role assignments"
  ON public.user_roles FOR UPDATE TO authenticated
  USING  ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- Admins can revoke roles, but cannot revoke their own admin role
CREATE POLICY "Admins can remove role assignments"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND NOT (
      auth.uid() = user_id
      AND role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );

-- ============================================================
-- 11. Triggers — user_roles
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

-- ============================================================
-- 12. Triggers — roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_builtin_role_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.builtin THEN
    RAISE EXCEPTION 'Built-in role "%" cannot be deleted.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_role_delete_prevent_builtin
  BEFORE DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_builtin_role_deletion();

CREATE OR REPLACE FUNCTION public.prevent_builtin_role_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.builtin AND NEW.name != OLD.name THEN
    RAISE EXCEPTION 'Built-in role "%" cannot be renamed.', OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_role_update_prevent_builtin_rename
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_builtin_role_rename();

-- ============================================================
-- 13. Profile role trigger function (re-declare for clean state)
-- The trigger on_profile_created_assign_role on public.profiles
-- is unchanged — only the function body is refreshed.
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
