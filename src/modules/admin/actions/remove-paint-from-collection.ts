'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/**
 * Server action that removes a paint from a target user's collection.
 *
 * Self-protection: rejects if the admin is attempting to modify their own
 * collection through the admin UI.
 *
 * @param userId - UUID of the target user.
 * @param paintId - UUID of the paint to remove.
 * @returns An object with an optional `error` string on failure.
 */
export async function removePaintFromCollection(
  userId: string,
  paintId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  if (user.id === userId) {
    return { error: 'Use your own collection page to modify your paints.' }
  }

  const { error } = await supabase
    .from('user_paints')
    .delete()
    .eq('user_id', userId)
    .eq('paint_id', paintId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/users/${userId}/collection`)
  return {}
}
