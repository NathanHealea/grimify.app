import { createClient } from '@/lib/supabase/server'
import type { CollectionPaint } from '@/modules/collection/types/collection-paint'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import type { ProfileRow } from '@/modules/user/services/profile-service'

/**
 * A user's collection data as fetched by an admin.
 *
 * Combines the user's profile with their paint collection and total count.
 */
export type AdminUserCollection = {
  /** The target user's profile. */
  profile: Pick<ProfileRow, 'id' | 'display_name' | 'email' | 'avatar_url'>
  /** All paints in the user's collection, newest first. */
  paints: CollectionPaint[]
  /** Total number of paints in the collection. */
  count: number
}

/**
 * Fetches a user's profile and their full paint collection.
 *
 * Requires admin RLS policies on `user_paints`. Returns `null` if the
 * profile does not exist.
 *
 * @param userId - UUID of the target user.
 * @returns The user's profile + collection, or `null` if the profile is missing.
 */
export async function getUserCollection(
  userId: string
): Promise<AdminUserCollection | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url')
    .eq('id', userId)
    .single()

  if (!profile) return null

  const { data } = await supabase
    .from('user_paints')
    .select('added_at, paints(*, product_lines(*, brands(*)))')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })

  type RawRow = { added_at: string; paints: PaintWithBrand | null }
  const rows = (data ?? []) as unknown as RawRow[]

  const paints: CollectionPaint[] = rows
    .filter((r): r is { added_at: string; paints: PaintWithBrand } => r.paints !== null)
    .map((r) => ({ ...r.paints, added_at: r.added_at }))

  return {
    profile: profile as Pick<ProfileRow, 'id' | 'display_name' | 'email' | 'avatar_url'>,
    paints,
    count: paints.length,
  }
}

/**
 * Searches a user's collection by paint name, hex, brand, or paint type.
 *
 * Returns all matching results — callers are responsible for pagination.
 * Filtering is done in JS after fetching all collection rows so that brand
 * name (nested two levels deep) can be matched. Mirrors the approach used
 * in `CollectionService.searchCollection`.
 *
 * @param userId - UUID of the target user.
 * @param query - Search string. Prefix with `#` to match hex codes.
 * @returns All matching {@link CollectionPaint} rows, or `[]` on error.
 */
export async function searchUserCollection(
  userId: string,
  query: string,
): Promise<CollectionPaint[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_paints')
    .select('added_at, paints(*, product_lines(*, brands(*)))')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })

  if (error || !data) return []

  type RawRow = { added_at: string; paints: PaintWithBrand | null }
  const rows = data as unknown as RawRow[]

  const term = query.toLowerCase()
  const isHex = query.startsWith('#')

  const results: CollectionPaint[] = []

  for (const row of rows) {
    if (!row.paints) continue
    const paint = row.paints
    const matches = isHex
      ? paint.hex.toLowerCase().includes(term.slice(1))
      : paint.name.toLowerCase().includes(term) ||
        (paint.paint_type?.toLowerCase().includes(term) ?? false) ||
        paint.product_lines.brands.name.toLowerCase().includes(term)

    if (matches) results.push({ ...paint, added_at: row.added_at })
  }

  return results
}

/**
 * Returns the total number of paints in a user's collection.
 *
 * @param userId - UUID of the target user.
 * @returns Total paint count.
 */
export async function countUserPaints(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('user_paints')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}
