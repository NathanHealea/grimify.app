'use server'

import { createClient } from '@/lib/supabase/server'
import { searchUserCollection } from '@/modules/admin/services/collection-service'
import type { CollectionPaint } from '@/modules/collection/types/collection-paint'

/**
 * Server action that searches a target user's collection.
 *
 * Requires the caller to be an authenticated admin. Returns an empty array
 * for unauthenticated callers rather than surfacing an auth error.
 *
 * @param userId - UUID of the target user whose collection to search.
 * @param query - Search string. Prefix with `#` to match hex codes.
 * @returns `{ paints: CollectionPaint[] }` on success, `{ error: string }` on failure.
 */
export async function searchUserCollectionAction(
  userId: string,
  query: string
): Promise<{ paints: CollectionPaint[] } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { paints: [] }

  const paints = await searchUserCollection(userId, query)
  return { paints }
}
