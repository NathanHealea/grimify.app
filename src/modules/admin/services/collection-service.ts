import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import { getProfileById } from '@/modules/user/services/profile-service'
import type { ProfileRow } from '@/modules/user/services/profile-service'

/**
 * Combined result of a user profile + first collection page fetch.
 *
 * @param profile - The user's profile row, or `null` if the user was not found.
 * @param initialPaints - First page of paints in the user's collection.
 * @param totalCount - Total number of paints in the collection (for pagination).
 */
export type AdminCollectionPageData = {
  profile: ProfileRow | null
  initialPaints: PaintWithBrand[]
  totalCount: number
}

/**
 * Fetches user profile and first collection page in parallel for the admin
 * collection page SSR prefetch.
 *
 * Combines {@link getProfileById} and `searchPaintsUnified` with
 * `scope: userCollection` into a single parallel call so the page loads with
 * both the profile header and the initial paint grid already populated.
 *
 * @param userId - UUID of the target user.
 * @param options.limit - Page size for the initial paint fetch.
 * @param options.offset - Row offset for the initial paint fetch.
 * @returns Profile row (or `null`) alongside the first page of collection paints.
 */
export async function getAdminCollectionPageData(
  userId: string,
  options: { limit: number; offset: number }
): Promise<AdminCollectionPageData> {
  const paintService = await getPaintService()

  const [profile, { paints: initialPaints, count: totalCount }] = await Promise.all([
    getProfileById(userId),
    paintService.searchPaintsUnified({
      scope: { type: 'userCollection', userId },
      limit: options.limit,
      offset: options.offset,
    }),
  ])

  return { profile, initialPaints, totalCount }
}
