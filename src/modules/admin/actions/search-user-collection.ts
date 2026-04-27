'use server'

import { createClient } from '@/lib/supabase/server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Server action that searches or browses a target user's paint collection.
 *
 * Requires an authenticated caller. Scopes the search to the target user's
 * collection via `searchPaintsUnified`; RLS enforces row-level access on the
 * underlying `user_paints` table.
 *
 * @param userId - UUID of the target user whose collection to search.
 * @param options.query - Search string matched against name, paint type, and brand.
 * @param options.hueIds - Hue UUIDs to filter by.
 * @param options.limit - Maximum number of results to return.
 * @param options.offset - Number of results to skip.
 * @returns `{ paints, count }` matching the search criteria.
 * @throws When the caller is not authenticated.
 */
export async function searchUserCollectionAction(
  userId: string,
  options: {
    query?: string
    hueIds?: string[]
    limit: number
    offset: number
  }
): Promise<{ paints: PaintWithBrand[]; count: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated.')

  const paintService = getPaintService()
  return (await paintService).searchPaintsUnified({
    query: options.query,
    hueIds: options.hueIds,
    scope: { type: 'userCollection', userId },
    limit: options.limit,
    offset: options.offset,
  })
}
