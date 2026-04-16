# Admin Profile Editing

**Epic:** User Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/admin-profile-editing`
**Merge into:** `v1/main`

## Summary

Allow administrators to edit any user's profile fields (display name, bio, avatar URL) from the admin user detail page. This is separate from the user's own profile editing — admins need the ability to correct display names, remove inappropriate content, or fix profile issues on behalf of users.

## Acceptance Criteria

- [ ] Admins can edit a user's display name from the admin user detail page
- [ ] Admins can edit a user's bio from the admin user detail page
- [ ] Admins can edit a user's avatar URL from the admin user detail page
- [ ] Display name validation enforces the same rules as user self-edit (3-20 chars, alphanumeric + hyphen/underscore, unique)
- [ ] Changes are saved to the `profiles` table
- [ ] The admin edit form pre-fills with the user's current profile data
- [ ] Non-admin users cannot access admin profile editing
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

No new routes. Profile editing is integrated into the user detail page from User Account Management.

| Route                   | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `/admin/users/[userId]` | Existing user detail page — add profile edit section     |

## Database

### Migration: Admin profile update policy

The current `profiles` RLS policy only allows users to update their own profile (`auth.uid() = id`). Add a policy that allows admins to update any profile:

```sql
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));
```

## Key Files

| Action | File                                                        | Description                                       |
| ------ | ----------------------------------------------------------- | ------------------------------------------------- |
| Create | `supabase/migrations/XXXXXX_add_admin_profile_update.sql`   | RLS policy for admin profile updates              |
| Create | `src/modules/admin/actions/update-profile.ts`               | Server action for admin profile update            |
| Create | `src/modules/admin/components/admin-profile-form.tsx`       | Profile edit form for admin context               |
| Modify | `src/app/admin/users/[userId]/page.tsx`                     | Add profile edit section to user detail page      |

## Implementation

### Step 1: Database migration — Admin profile update policy

Create `supabase/migrations/XXXXXX_add_admin_profile_update.sql`:

Add a new UPDATE policy on `profiles` that allows admin users to update any profile. This does not modify the existing self-update policy — both policies coexist (Supabase uses OR logic for multiple policies).

### Step 2: Admin profile update action

Create `src/modules/admin/actions/update-profile.ts`:

Server action that:
1. Validates the caller has the admin role via `hasRole()`
2. Extracts `userId`, `displayName`, `bio`, `avatarUrl` from form data
3. Validates display name using the existing `validateDisplayName()` from `src/modules/user/validation.ts`
4. Updates the `profiles` row: `supabase.from('profiles').update({ display_name, bio, avatar_url, updated_at: new Date() }).eq('id', userId)`
5. Handles unique constraint violation (error code `23505`) for duplicate display names
6. Revalidates the user detail page
7. Returns success or field-level errors (reuse `ProfileFormState` type pattern)

### Step 3: Admin profile edit form

Create `src/modules/admin/components/admin-profile-form.tsx`:

- Client component using `useActionState(updateProfile, initialState)`
- Fields: display name (text input), bio (textarea), avatar URL (text input)
- Pre-filled with current profile data via props
- Uses the same validation feedback patterns as the existing profile setup form
- Submit button: "Update Profile" / "Updating..."
- Success and error alerts

### Step 4: Integrate into user detail page

Modify `src/app/admin/users/[userId]/page.tsx`:

- Add a "Profile" section (card) that renders `AdminProfileForm` with the user's current profile data
- This section appears before the Roles and Auth Info sections
- Pass profile data as props: `{ userId, displayName, bio, avatarUrl }`

### Step 5: Build and verify

Run `npm run build` and `npm run lint`.

## Key Design Decisions

1. **Separate RLS policy, not SECURITY DEFINER** — Instead of using a SECURITY DEFINER function to bypass RLS, we add a proper policy for admins. This keeps the audit trail clear and follows the principle of least privilege.
2. **Reuse existing validation** — The admin form uses the same `validateDisplayName()` function as the user-facing profile setup. Consistent rules regardless of who is editing.
3. **Integrated into user detail page** — Profile editing is a section on the user detail page, not a separate route. This keeps the admin workflow consolidated: view a user → edit their profile → manage their roles → all in one place.
4. **No avatar upload** — This feature accepts an avatar URL string, not file uploads. Avatar upload functionality (if needed) is a future enhancement. OAuth users already get their avatar from the provider; admins can paste a URL to override.
