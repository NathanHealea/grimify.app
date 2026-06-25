'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/**
 * Server action to atomically merge a source profile into a target profile.
 *
 * Calls the `merge_profiles` RPC (SECURITY DEFINER) which validates admin access,
 * transfers role assignments, fills null target profile fields from the source,
 * then permanently deletes the source profile. On success, redirects to the
 * target user's admin detail page.
 *
 * @param _prevState - Previous action state (required by `useActionState` signature).
 * @param formData - Must include `sourceId` and `targetId` UUID strings.
 * @returns An error message string on failure, or redirects to target user page on success.
 */
export async function mergeProfiles(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const sourceId = formData.get('sourceId') as string
  const targetId = formData.get('targetId') as string

  if (!sourceId || !targetId) return 'Source and target profiles are required.'

  const supabase = await createClient()

  const { error } = await supabase.rpc('merge_profiles', {
    source_uuid: sourceId,
    target_uuid: targetId,
  })

  if (error) return error.message

  redirect(`/admin/users/${targetId}`)
}
