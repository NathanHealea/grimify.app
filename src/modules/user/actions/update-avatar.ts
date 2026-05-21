'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

/**
 * Server action that uploads a resized avatar to Supabase Storage and saves
 * the public URL to the authenticated user's profile.
 *
 * Validates that the submitted file is an image and is within the 2 MB size
 * limit (the client resizes before upload, but the server enforces the cap).
 * The avatar is stored at `avatars/{userId}` (upserted on every upload).
 * A cache-busting query param is appended to the saved URL so browsers
 * re-fetch the updated image.
 *
 * On success, revalidates the layout cache and the user's public profile
 * page, then returns `null`.
 *
 * @param _prevState - Previous action state (unused, required by `useTransition` pattern).
 * @param formData - FormData containing the `avatar` file.
 * @returns `null` on success, or `{ error: string }` on failure.
 */
export async function updateAvatar(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to upload an avatar.' }
  }

  const file = formData.get('avatar')

  if (!(file instanceof File)) {
    return { error: 'No file was submitted.' }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: 'Avatar must be a JPEG, PNG, WebP, or GIF image.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Avatar must be 2 MB or smaller.' }
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(user.id, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(user.id)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/users/' + user.id)

  return null
}
