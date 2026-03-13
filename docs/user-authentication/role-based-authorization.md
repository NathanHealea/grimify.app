# Role-Based Authorization

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Implement role-based authorization with `user` and `administrator` roles. All users receive the `user` role by default on signup. A user can have multiple roles. Users can manage their own profile/account. Administrators can manage any account. Roles are enforced via RLS policies and middleware.

## Acceptance Criteria

- [ ] `roles` table created with seeded roles: `user`, `administrator`
- [ ] `user_roles` join table linking profiles to roles (many-to-many)
- [ ] Default `user` role auto-assigned on profile creation via database trigger
- [ ] Role helper functions: `getUserRoles()`, `hasRole()`, `hasAnyRole()` at `src/lib/supabase/roles.ts`
- [ ] Admin Supabase client at `src/lib/supabase/admin.ts` using service role key
- [ ] Middleware protects admin routes (e.g., `/admin/*`) — requires `administrator` role
- [ ] RLS policies: admins can read/update/delete any profile; users can only manage their own
- [ ] Admin user management page at `/admin/users` — list, edit, delete any user
- [ ] Admin can assign/remove roles for other users (but not themselves)
- [ ] Admins cannot remove the base `user` role from any account
- [ ] Role type defined at `src/types/role.ts`

## Implementation Plan

### Step 1: Create roles migration

**`supabase/migrations/{timestamp}_create_roles_tables.sql`**

```sql
CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO public.roles (name) VALUES ('user'), ('administrator');

CREATE TABLE public.user_roles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id INT REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Auto-assign 'user' role on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM public.roles r WHERE r.name = 'user';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile_role();

-- Helper function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(uid UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    array_agg(r.name),
    ARRAY['user']::TEXT[]
  )
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = uid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS: authenticated can read roles
CREATE POLICY "Authenticated can read roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read user_roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

-- RLS: only admins can modify user_roles (not their own)
CREATE POLICY "Admins can insert user_roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    'administrator' = ANY(public.get_user_roles(auth.uid()))
    AND user_id != auth.uid()
  );

CREATE POLICY "Admins can delete user_roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    'administrator' = ANY(public.get_user_roles(auth.uid()))
    AND user_id != auth.uid()
    AND role_id != (SELECT id FROM public.roles WHERE name = 'user')
  );
```

### Step 2: Update profiles RLS for admin access

**`supabase/migrations/{timestamp}_admin_profile_policies.sql`**

Add policies allowing administrators to read/update/delete any profile:

```sql
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));
```

### Step 3: Create role helpers

**`src/lib/supabase/roles.ts`**:
- `getUserRoles(userId)` — Calls `get_user_roles` RPC or queries `user_roles` join
- `hasRole(userId, role)` — Boolean check
- `hasAnyRole(userId, roles)` — Boolean check for any role in array

**`src/lib/supabase/admin.ts`**:
- Admin client using `SUPABASE_SERVICE_ROLE_KEY` for server-only operations (user deletion, etc.)

Reference: `grimdark.nathanhealea.com/src/lib/supabase/roles.ts` and `admin.ts`

### Step 4: Create role type

**`src/types/role.ts`**:
```typescript
export type Role = 'user' | 'administrator'
```

### Step 5: Update middleware for admin routes

Update **`src/middleware.ts`** to check roles for `/admin/*` routes. Redirect to `/` if user lacks `administrator` role.

### Step 6: Create admin user management pages

**`src/app/admin/users/page.tsx`** — List all users with their roles. Actions: edit profile, manage roles, delete user.

**`src/app/admin/users/[id]/page.tsx`** — Edit a specific user's profile and roles.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_roles_tables.sql` | New — roles, user_roles, triggers, RLS |
| `supabase/migrations/{timestamp}_admin_profile_policies.sql` | New — admin RLS policies for profiles |
| `src/types/role.ts` | New — Role type |
| `src/lib/supabase/roles.ts` | New — role helper functions |
| `src/lib/supabase/admin.ts` | New — admin Supabase client |
| `src/middleware.ts` | Add admin route protection |
| `src/app/admin/users/page.tsx` | New — admin user list |
| `src/app/admin/users/[id]/page.tsx` | New — admin user edit |

### Risks & Considerations

- The `SECURITY DEFINER` on role functions is necessary to bypass RLS when checking roles within policies. Ensure these functions don't leak data.
- Admin self-modification is intentionally restricted — admins cannot change their own roles via the UI (prevents accidental lockout).
- The base `user` role cannot be removed from any account — this is enforced at the database level.
- Reference `grimdark.nathanhealea.com/supabase/migrations/20260218000000_create_roles_tables.sql` and `20260220200000_admin_profile_policies.sql`.
