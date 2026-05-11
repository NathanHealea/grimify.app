# Edit User Profile

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Todo
**Branch:** `feature/edit-user-profile`
**Merge into:** `main`

## Summary

Allow authenticated users to update their own profile information — display name, bio, and avatar — from a unified `/profile/edit` page. The page already exists but currently only surfaces password management. This feature expands it into a full profile settings hub.

## Acceptance Criteria

- [ ] Authenticated users can update their display name from `/profile/edit`
- [ ] Authenticated users can update their bio from `/profile/edit`
- [ ] Authenticated users can upload a new avatar image from `/profile/edit`
- [ ] Display name validation enforces the existing rules (3-20 chars, `[a-zA-Z0-9_-]+`, unique case-insensitively)
- [ ] Bio is optional, capped at 500 characters
- [ ] Avatar uploads are stored in Supabase Storage and the resulting public URL is saved to `profiles.avatar_url`
- [ ] The profile info form is pre-filled with the user's current display name and bio
- [ ] The current avatar is previewed above the upload input
- [ ] Success and field-level errors are surfaced after each form submission
- [ ] Display name and avatar changes are immediately reflected in the navbar after submission (layout revalidated)
- [ ] The public profile page at `/users/[id]` reflects changes after editing
- [ ] The user menu dropdown includes an "Edit profile" link to `/profile/edit`
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route           | Description                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `/profile/edit` | Existing page — expanded with profile info and avatar sections           |

## Database

### Supabase Storage — `avatars` bucket

Create a public `avatars` bucket with per-user upload/replace policies:

```sql
-- Create the avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

-- Allow authenticated users to replace their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND name = auth.uid()::text);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND name = auth.uid()::text);
```

Avatars are stored as `avatars/{userId}` (no extension, replaced on each upload). The public URL is derived from the Supabase project URL.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/migrations/XXXXXX_create_avatars_bucket.sql` | Storage bucket + RLS policies for avatar uploads |
| Modify | `src/modules/user/validation.ts` | Add `validateBio()` helper |
| Create | `src/modules/user/types/update-profile-form-values.ts` | `{ display_name: string; bio: string }` |
| Create | `src/modules/user/types/update-profile-form-state.ts` | Form state with field-level errors for display_name and bio |
| Create | `src/modules/user/actions/update-profile.ts` | Server action — update display_name and bio |
| Create | `src/modules/user/actions/update-avatar.ts` | Server action — upload avatar to Storage and update avatar_url |
| Create | `src/modules/user/components/edit-profile-form.tsx` | Form for editing display name and bio |
| Create | `src/modules/user/components/edit-avatar-form.tsx` | Form for uploading/replacing avatar |
| Modify | `src/app/profile/edit/page.tsx` | Expand page with profile info and avatar sections |
| Modify | `src/modules/user/components/user-menu.tsx` | Add "Edit profile" dropdown item |

## Implementation

### Step 1: Storage migration — avatars bucket

Create `supabase/migrations/XXXXXX_create_avatars_bucket.sql`.

Insert the `avatars` bucket as public, then add three storage RLS policies scoped to `auth.uid()::text` as the object name. Using the user's UUID as the filename (no extension) ensures each upload replaces the previous avatar without leaving orphaned files.

Apply with `supabase db push` or `supabase migration up`.

### Step 2: Add `validateBio` to validation

Modify `src/modules/user/validation.ts`.

Add a new exported function:

```ts
export function validateBio(bio: string): string | null {
  if (bio.length > 500) return 'Bio must be 500 characters or fewer.'
  return null
}
```

Bio is optional — an empty string is valid.

### Step 3: Create `UpdateProfileFormValues` type

Create `src/modules/user/types/update-profile-form-values.ts`:

```ts
export type UpdateProfileFormValues = {
  display_name: string
  bio: string
}
```

### Step 4: Create `UpdateProfileFormState` type

Create `src/modules/user/types/update-profile-form-state.ts`:

```ts
export type UpdateProfileFormState = {
  errors?: {
    display_name?: string
    bio?: string
  }
  error?: string
  success?: boolean
} | null
```

Include a `success` flag so the form can show a success message without navigating away.

### Step 5: Create `update-profile` server action

Create `src/modules/user/actions/update-profile.ts`.

Server action signature: `updateProfile(_prevState: UpdateProfileFormState, formData: FormData): Promise<UpdateProfileFormState>`

Logic:
1. Get authenticated user via `createClient().auth.getUser()`; return error if not signed in
2. Extract `display_name` and `bio` from `formData`
3. Validate both with `validateDisplayName()` and `validateBio()`; return field errors if invalid
4. Call `supabase.from('profiles').update({ display_name, bio, updated_at: new Date().toISOString() }).eq('id', user.id)`
5. Handle unique constraint violation (`error.code === '23505'`) → return field error on `display_name`
6. On success: `revalidatePath('/', 'layout')` and `revalidatePath('/users/' + user.id)`; return `{ success: true }`

### Step 6: Create `update-avatar` server action

Create `src/modules/user/actions/update-avatar.ts`.

Server action signature: `updateAvatar(_prevState: { error?: string } | null, formData: FormData): Promise<{ error?: string } | null>`

Logic:
1. Get authenticated user; return error if not signed in
2. Extract the `File` from `formData.get('avatar')`; validate it is a file, is an image MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), and is under 2 MB
3. Upload to Supabase Storage: `supabase.storage.from('avatars').upload(user.id, file, { upsert: true, contentType: file.type })`
4. On upload error, return `{ error: uploadError.message }`
5. Get the public URL: `supabase.storage.from('avatars').getPublicUrl(user.id).data.publicUrl`
6. Update `profiles.avatar_url` with the public URL + a cache-busting query param (`?t=${Date.now()}`)
7. `revalidatePath('/', 'layout')` and `revalidatePath('/users/' + user.id)`; return `null`

### Step 7: Create `EditProfileForm` component

Create `src/modules/user/components/edit-profile-form.tsx`.

Client component using `useActionState(updateProfile, null)`.

Props: `defaultValues: UpdateProfileFormValues`

Fields:
- **Display name** — `<Input>` with `name="display_name"`, same HTML constraints as the setup form (`minLength={3}`, `maxLength={20}`, `pattern="^[a-zA-Z0-9_-]+$"`)
- **Bio** — `<Textarea>` with `name="bio"`, `maxLength={500}`, optional

UI behavior:
- Client-side validation on submit (prevent submission if display name is invalid)
- Character counter for bio (`{bio.length}/500`) using controlled state
- Show `state.errors.display_name` / `state.errors.bio` as `<p className="form-message text-sm text-destructive">` under each field
- Show `state.error` as a general error banner
- Show `state.success` as a success message ("Profile updated.")
- Submit button: "Save changes" / "Saving…" while pending

### Step 8: Create `EditAvatarForm` component

Create `src/modules/user/components/edit-avatar-form.tsx`.

Client component using `useActionState(updateAvatar, null)`.

Props: `currentAvatarUrl: string | null`, `displayName: string`

UI:
- Show the current avatar (`<Image>` if URL exists, initials avatar placeholder if not) at `size-20`
- `<Input type="file" name="avatar" accept="image/*">` — plain file input
- Client-side preview: on file selection (`onChange`), create an `ObjectURL` and display it in place of the current avatar
- Show `state?.error` as an error message
- Submit button: "Upload avatar" / "Uploading…" while pending
- Note below input: "JPEG, PNG, WebP, or GIF — max 2 MB"

### Step 9: Expand `/profile/edit` page

Modify `src/app/profile/edit/page.tsx`.

Fetch the authenticated user's full profile (`display_name`, `bio`, `avatar_url`) in addition to the existing `hasEmailIdentity` check.

Render three card sections in this order:

1. **Profile** card (always visible)
   - `<CardTitle>Profile</CardTitle>`, `<CardDescription>Update your display name and bio.</CardDescription>`
   - Renders `<EditProfileForm defaultValues={{ display_name, bio }} />`

2. **Avatar** card (always visible)
   - `<CardTitle>Avatar</CardTitle>`, `<CardDescription>Upload a profile picture.</CardDescription>`
   - Renders `<EditAvatarForm currentAvatarUrl={avatarUrl} displayName={displayName} />`

3. **Password** card (only if `hasEmailIdentity`)
   - Existing `<ChangePasswordForm />` — no changes needed

### Step 10: Add "Edit profile" to UserMenu

Modify `src/modules/user/components/user-menu.tsx`.

Add a second `<DropdownMenuItem asChild>` below the display name item:

```tsx
<DropdownMenuItem asChild>
  <Link href="/profile/edit">Edit profile</Link>
</DropdownMenuItem>
```

### Step 11: Build and verify

Run `npm run build` and `npm run lint`. Confirm no type errors.

## Risks & Considerations

- **Avatar cache busting** — Supabase Storage serves the same public URL for a given path even after an `upsert`. Append `?t={timestamp}` to `avatar_url` when saving so browsers re-fetch the new image. Strip existing query params before comparing or storing.
- **File size validation** — Validate client-side (file input `onChange`) and server-side (in the action) to avoid uploading large files before returning an error.
- **Supabase Storage local dev** — Ensure `supabase start` includes the storage service. The local stack does support storage, but the migration must run before the bucket is accessible.
- **Display name uniqueness** — The RLS self-update policy is already in place. The unique partial index on `profiles.display_name` enforces uniqueness; the action handles the `23505` error.
