'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

/**
 * Admin server action that uploads an avatar for any user.
 *
 * Uses the service-role client to bypass storage RLS policies, which are
 * scoped to the uploading user's own files. The calling user must still be
 * authenticated; authorization is enforced by the admin RLS policy on the
 * `profiles` table when updating `avatar_url`.
 *
 * @param targetUserId - UUID of the user whose avatar is being updated.
 * @param _prevState - Previous action state (unused).
 * @param formData - FormData containing the `avatar` file.
 * @returns `null` on success, or `{ error: string }` on failure.
 */
export async function updateAvatarAsAdmin(
  targetUserId: string,
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to perform this action.' }
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

  const { error: uploadError } = await adminSupabase.storage
    .from('avatars')
    .upload(targetUserId, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: urlData } = adminSupabase.storage.from('avatars').getPublicUrl(targetUserId)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/users/' + targetUserId)
  revalidatePath('/admin/users')

  return null
}
