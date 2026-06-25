'use server'

import { createClient } from '@/lib/supabase/server'
import type { MergePreview } from '@/modules/admin/types/merge-preview'

/**
 * Fetches a preview of what will be transferred when merging two profiles.
 * Non-destructive — does not execute the merge.
 *
 * Relies on the `merge_preview` RPC (SECURITY DEFINER) which enforces admin
 * access and validates that source ≠ target.
 *
 * @param sourceId - UUID of the profile to be merged away (source).
 * @param targetId - UUID of the profile to keep (target).
 * @returns The merge preview data or an object with an `error` message.
 */
export async function getMergePreview(
  sourceId: string,
  targetId: string,
): Promise<MergePreview | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('merge_preview', {
    source_uuid: sourceId,
    target_uuid: targetId,
  })

  if (error) return { error: error.message }
  return data as MergePreview
}
