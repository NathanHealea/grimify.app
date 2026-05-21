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
- [ ] Bio is optional, capped at 500 characters, edited via the `MarkdownEditor` component
- [ ] Avatar uploads are stored in Supabase Storage and the resulting public URL is saved to `profiles.avatar_url`
- [ ] Avatar images are resized client-side to fit within **800 × 800 px** before upload; aspect ratio is preserved
- [ ] Avatar file size is validated server-side at **2 MB** maximum after resize
- [ ] The profile info form is pre-filled with the user's current display name and bio
- [ ] The current avatar is previewed above the upload input; a client-side preview updates immediately on file selection
- [ ] Success and field-level errors are surfaced after each form submission
- [ ] Display name and avatar changes are immediately reflected in the navbar after submission (layout revalidated)
- [ ] The public profile page at `/users/[id]` renders the bio as markdown
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
| Create | `src/modules/user/utils/resize-image-to-fit.ts` | Client-side Canvas API utility — resize image to max 800×800 px |
| Create | `src/modules/user/components/edit-profile-form.tsx` | Form for editing display name and bio (bio uses `MarkdownEditor`) |
| Create | `src/modules/user/components/edit-avatar-form.tsx` | Form for uploading/replacing avatar (client-side resize before upload) |
| Modify | `src/app/profile/edit/page.tsx` | Expand page with profile info and avatar sections |
| Modify | `src/app/users/[id]/page.tsx` | Render bio with `MarkdownRenderer` instead of plain text |
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
2. Extract the `File` from `formData.get('avatar')`; validate it is a file, is an image MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), and is under **2 MB** — the client resizes before upload but always validate server-side
3. Upload to Supabase Storage: `supabase.storage.from('avatars').upload(user.id, file, { upsert: true, contentType: file.type })`
4. On upload error, return `{ error: uploadError.message }`
5. Get the public URL: `supabase.storage.from('avatars').getPublicUrl(user.id).data.publicUrl`
6. Update `profiles.avatar_url` with the public URL + a cache-busting query param (`?t=${Date.now()}`)
7. `revalidatePath('/', 'layout')` and `revalidatePath('/users/' + user.id)`; return `null`

### Step 7: Create `resizeImageToFit` utility

Create `src/modules/user/utils/resize-image-to-fit.ts`.

Client-side Canvas API helper that scales an image down to fit within a bounding box while preserving aspect ratio. If the image is already within the bounds, it is returned as-is (re-encoded as JPEG for consistency).

```ts
/**
 * Scales an image File/Blob down to fit within maxWidth × maxHeight using the
 * Canvas API. The aspect ratio is preserved; images already within bounds are
 * returned without upscaling. Output is always JPEG at 85% quality.
 *
 * @param file - The source image File or Blob.
 * @param maxWidth - Maximum output width in pixels.
 * @param maxHeight - Maximum output height in pixels.
 * @returns A Promise resolving to a JPEG Blob at the scaled dimensions.
 */
export function resizeImageToFit(
  file: File | Blob,
  maxWidth: number,
  maxHeight: number,
): Promise<Blob>
```

Implementation sketch:
1. Create an `<img>` element and set `src` to `URL.createObjectURL(file)`
2. On `img.onload`: compute `ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1)`; scale both dimensions
3. Draw to an off-screen `<canvas>` at the scaled dimensions via `ctx.drawImage`
4. Call `canvas.toBlob(resolve, 'image/jpeg', 0.85)` and revoke the ObjectURL in cleanup
5. On `img.onerror`: revoke ObjectURL and reject with an error

Maximum output: 800 × 800 px. This is the only place the 800 px constant is declared — do not hardcode it in `EditAvatarForm`.

### Step 8: Create `EditProfileForm` component

Create `src/modules/user/components/edit-profile-form.tsx`.

Client component using `useActionState(updateProfile, null)`.

Props: `defaultValues: UpdateProfileFormValues`

Fields:
- **Display name** — `<Input>` with `name="display_name"`, same HTML constraints as the setup form (`minLength={3}`, `maxLength={20}`, `pattern="^[a-zA-Z0-9_-]+$"`)
- **Bio** — `<MarkdownEditor id="bio" name="bio" defaultValue={defaultValues.bio ?? ''} maxLength={500} placeholder="Tell the community about yourself…" />` — uses the established `MarkdownEditor` component from `src/modules/markdown/components/markdown-editor.tsx`. The `MarkdownEditor` is uncontrolled, so its value is read by the server action via `FormData` on submit. The built-in character counter and preview toggle are included automatically.

UI behavior:
- Client-side validation on submit (prevent submission if display name is invalid using `validateDisplayName`)
- Show `state?.errors?.display_name` / `state?.errors?.bio` via `error` prop on each field / below `MarkdownEditor`
- Show `state?.error` as a general error banner
- Show `state?.success` as a success message ("Profile updated.")
- Submit button: "Save changes" / "Saving…" while pending

### Step 9: Create `EditAvatarForm` component

Create `src/modules/user/components/edit-avatar-form.tsx`.

Client component using `useTransition` (not `useActionState`) because the file must be processed through `resizeImageToFit` before it is passed to the server action. A custom `handleSubmit` intercepts the form submission.

Props: `currentAvatarUrl: string | null`, `displayName: string`

State:
- `processedBlob: Blob | null` — the resized image ready for upload
- `previewUrl: string | null` — ObjectURL for the live preview (initialized from `currentAvatarUrl`)
- `clientError: string | null` — file validation errors surfaced before the server call

`onChange` handler (file input):
1. Validate the selected file is an image MIME type; set `clientError` and return early if not
2. Call `await resizeImageToFit(file, 800, 800)` to get the output `Blob`
3. Revoke any previous ObjectURL, then set `previewUrl = URL.createObjectURL(blob)` and `processedBlob = blob`

`handleSubmit`:
1. Prevent default; return if no `processedBlob`
2. Build `formData` manually: `formData.append('avatar', processedBlob, 'avatar.jpg')`
3. Call `startTransition(async () => { const result = await updateAvatar(null, formData); if (result?.error) { ... } })`

UI:
- Show the current avatar (`<Image>` from `next/image` if URL exists, initials placeholder if not) at `size-20` rounded-full; `src` updates to `previewUrl` as soon as the user selects a file
- `<Input type="file" accept="image/*">` — **uncontrolled** (value not bound to state; the blob is extracted in `onChange`)
- Show `clientError` or `result?.error` as an inline error message
- Submit button: "Upload avatar" / "Uploading…" while `isPending`
- Helper text below input: "JPEG, PNG, WebP, or GIF — resized to max 800 × 800 px, 2 MB limit"

### Step 10: Expand `/profile/edit` page

Modify `src/app/profile/edit/page.tsx`.

Fetch the authenticated user's full profile (`display_name`, `bio`, `avatar_url`) via `getProfileById(user.id)` in addition to the existing `hasEmailIdentity` check.

Render three card sections in this order:

1. **Profile** card (always visible)
   - `<CardTitle>Profile</CardTitle>`, `<CardDescription>Update your display name and bio.</CardDescription>`
   - Renders `<EditProfileForm defaultValues={{ display_name: profile.display_name ?? '', bio: profile.bio ?? '' }} />`

2. **Avatar** card (always visible)
   - `<CardTitle>Avatar</CardTitle>`, `<CardDescription>Upload a profile picture.</CardDescription>`
   - Renders `<EditAvatarForm currentAvatarUrl={profile.avatar_url} displayName={profile.display_name ?? ''} />`

3. **Password** card (only if `hasEmailIdentity`)
   - Existing `<ChangePasswordForm />` — no changes needed

### Step 11: Update public profile page bio rendering

Locate `src/app/users/[id]/page.tsx` (or the component it delegates to). The bio field is currently rendered as plain text. Replace it with `<MarkdownRenderer content={bio} />` from `src/modules/markdown/components/markdown-renderer.tsx` so markdown stored by `EditProfileForm` is displayed correctly.

If the bio is `null` or empty, render nothing (no empty markdown renderer).

### Step 12: Add "Edit profile" to UserMenu

Modify `src/modules/user/components/user-menu.tsx`.

Add a `<DropdownMenuItem asChild>` entry linking to `/profile/edit`:

```tsx
<DropdownMenuItem asChild>
  <Link href="/profile/edit">Edit profile</Link>
</DropdownMenuItem>
```

Place it below the existing profile link and above the "Mine" section.

### Step 13: Build and verify

Run `npm run build` and `npm run lint`. Confirm no type errors.

## Risks & Considerations

- **Avatar cache busting** — Supabase Storage serves the same public URL for a given path even after an `upsert`. Append `?t={timestamp}` to `avatar_url` when saving so browsers re-fetch the new image. Strip existing query params before comparing or storing.
- **Client-side Canvas resize** — `resizeImageToFit` runs in the browser using the Canvas API (`document.createElement('canvas')`). It must not be imported server-side or from a Server Component. Keep it in `src/modules/user/utils/` and import it only from client components (`'use client'`).
- **ObjectURL cleanup** — `EditAvatarForm` must revoke the previous `previewUrl` ObjectURL before creating a new one in `onChange` to avoid memory leaks. Also revoke on component unmount via a `useEffect` cleanup.
- **Canvas output is always JPEG** — `resizeImageToFit` outputs JPEG regardless of the input format (PNG, WebP, GIF). This is intentional: JPEG produces smaller files for photos. Transparent PNGs will lose transparency (white background). If transparency support is needed in the future, pass the MIME type as a parameter and use `image/png` for PNG inputs.
- **File size validation** — Validate file type client-side (in the `onChange` handler) and both file type and size server-side (in the action). The resize reduces file size for large images, but a very large JPEG at 85% quality could still exceed 2 MB — the server check is the authoritative gate.
- **Supabase Storage local dev** — Ensure `supabase start` includes the storage service. The local stack does support storage, but the migration must run before the bucket is accessible.
- **Display name uniqueness** — The RLS self-update policy is already in place. The unique partial index on `profiles.display_name` enforces uniqueness; the action handles the `23505` error.
- **Bio as markdown** — Bio is stored as a raw markdown string in the `profiles.bio` column (max 500 chars). The `MarkdownEditor` is uncontrolled, so its value is submitted via `FormData` just like a plain textarea. The public profile page must render it with `<MarkdownRenderer>` — plain text rendering will show raw markdown syntax to users.
- **`MarkdownEditor` toolbar scope** — The default toolbar includes headings, bold, italic, code, and lists. For a bio field these are all reasonable. If you want a narrower toolbar (e.g. no headings), pass a custom `toolbar` prop — see `markdownToolbarPresets` in `src/modules/markdown/toolbar-actions/markdown-toolbar-presets.ts`.
