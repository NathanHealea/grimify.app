-- ============================================================
-- Role CRUD support: builtin column, RLS policies, and
-- protection triggers for admin role management
-- ============================================================

-- 1a. Add `builtin` column to roles
-- Distinguishes built-in roles from admin-created custom roles.
ALTER TABLE public.roles ADD COLUMN builtin boolean NOT NULL DEFAULT false;
UPDATE public.roles SET builtin = true WHERE name IN ('user', 'admin');

-- ============================================================
-- 1b. INSERT / UPDATE / DELETE RLS policies on roles
-- Currently only a SELECT policy exists. Add admin-only
-- mutation policies so role CRUD works through the UI.
-- ============================================================

-- INSERT: Only admins can create new roles
CREATE POLICY "Admins can create roles"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Only admins can rename roles
CREATE POLICY "Admins can update roles"
  ON public.roles FOR UPDATE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.roles FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- 1c. Trigger: prevent deletion of built-in roles
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_builtin_role_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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

-- ============================================================
-- 1d. Trigger: prevent renaming built-in roles
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_builtin_role_rename()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
