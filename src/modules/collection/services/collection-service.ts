import type { SupabaseClient } from '@supabase/supabase-js'

import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import type { CollectionPaint } from '@/modules/collection/types/collection-paint'
import type { CollectionStats } from '@/modules/collection/types/collection-stats'

/**
 * Creates a collection service bound to the given Supabase client.
 *
 * All user_paints queries are encapsulated here. Use the `.server.ts` or
 * `.client.ts` wrappers to obtain an instance with the correct client.
 *
 * Write operations rely on RLS to enforce ownership, but `userId` is passed
 * explicitly so the intent is clear when reading the code.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with collection query and mutation methods.
 */
export function createCollectionService(supabase: SupabaseClient) {
  return {
    /**
     * Returns the set of paint IDs in the user's collection.
     *
     * Returns a `Set<string>` for O(1) `has()` lookups from render code.
     *
     * @param userId - The authenticated user's UUID.
     * @returns Set of paint UUID strings.
     */
    async getUserPaintIds(userId: string): Promise<Set<string>> {
      const { data } = await supabase
        .from('user_paints')
        .select('paint_id')
        .eq('user_id', userId)

      return new Set((data ?? []).map((row: { paint_id: string }) => row.paint_id))
    },

    /**
     * Checks whether a specific paint is in the user's collection.
     *
     * @param userId - The authenticated user's UUID.
     * @param paintId - The paint's UUID.
     * @returns `true` if the paint is in the collection.
     */
    async isInCollection(userId: string, paintId: string): Promise<boolean> {
      const { data } = await supabase
        .from('user_paints')
        .select('paint_id')
        .eq('user_id', userId)
        .eq('paint_id', paintId)
        .maybeSingle()

      return data !== null
    },

    /**
     * Adds a paint to the user's collection.
     *
     * Idempotent — if the paint is already in the collection (unique constraint
     * violation, code `23505`) the call succeeds silently.
     *
     * @param userId - The authenticated user's UUID.
     * @param paintId - The paint's UUID to add.
     * @returns An object with an optional `error` string on failure.
     */
    async addPaint(userId: string, paintId: string): Promise<{ error?: string }> {
      const { error } = await supabase
        .from('user_paints')
        .insert({ user_id: userId, paint_id: paintId })

      if (error) {
        if (error.code === '23505') return {}
        return { error: error.message }
      }

      return {}
    },

    /**
     * Removes a paint from the user's collection.
     *
     * Idempotent — if the row does not exist the call succeeds silently.
     *
     * @param userId - The authenticated user's UUID.
     * @param paintId - The paint's UUID to remove.
     * @returns An object with an optional `error` string on failure.
     */
    async removePaint(userId: string, paintId: string): Promise<{ error?: string }> {
      const { error } = await supabase
        .from('user_paints')
        .delete()
        .eq('user_id', userId)
        .eq('paint_id', paintId)

      if (error) return { error: error.message }
      return {}
    },

    /**
     * Returns a paginated list of paints in the user's collection, ordered by
     * most recently added first.
     *
     * Returns {@link PaintWithBrand} rows compatible with {@link PaginatedPaintGrid}.
     *
     * @param userId - The authenticated user's UUID.
     * @param options.limit - Max rows to return (default 50).
     * @param options.offset - Row offset for pagination (default 0).
     * @returns Array of paints with product line and brand data.
     */
    async getCollectionPaints(
      userId: string,
      options?: { limit?: number; offset?: number },
    ): Promise<PaintWithBrand[]> {
      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0

      const { data } = await supabase
        .from('user_paints')
        .select('paints(*, product_lines(*, brands(*)))')
        .eq('user_id', userId)
        .order('added_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return ((data ?? []) as unknown as Array<{ paints: PaintWithBrand | null }>)
        .map((row) => row.paints)
        .filter((p): p is PaintWithBrand => p !== null)
    },

    /**
     * Returns the total number of paints in the user's collection.
     *
     * @param userId - The authenticated user's UUID.
     * @returns Total count of paints in the collection.
     */
    async getCollectionPaintCount(userId: string): Promise<number> {
      const { count } = await supabase
        .from('user_paints')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      return count ?? 0
    },

    /**
     * Removes multiple paints from the user's collection in a single call.
     *
     * Idempotent — absent paint IDs are ignored.
     *
     * @param userId - The authenticated user's UUID.
     * @param paintIds - Array of paint UUIDs to remove (max 500).
     * @returns The number of rows deleted and an optional `error` string.
     */
    async bulkRemovePaints(
      userId: string,
      paintIds: string[],
    ): Promise<{ error?: string; removedCount: number }> {
      const { error, count } = await supabase
        .from('user_paints')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .in('paint_id', paintIds)

      if (error) return { error: error.message, removedCount: 0 }
      return { removedCount: count ?? 0 }
    },

    /**
     * Returns aggregated statistics for the user's collection.
     *
     * Aggregation (total, top-5 brands, all paint types) is done in JS because
     * brand name is nested two levels deep and a SQL GROUP BY would require a
     * database function. Acceptable for v1 collections (typically <500 paints).
     *
     * @param userId - The authenticated user's UUID.
     * @returns {@link CollectionStats} — degrades to zero-state on error.
     */
    async getStats(userId: string): Promise<CollectionStats> {
      const { data, error } = await supabase
        .from('user_paints')
        .select('paints(paint_type, product_lines(brands(name)))')
        .eq('user_id', userId)

      if (error || !data) return { total: 0, byBrand: [], byType: [] }

      type StatRow = {
        paints: { paint_type: string | null; product_lines: { brands: { name: string } } } | null
      }

      const rows = (data as unknown as StatRow[]).map((r) => r.paints).filter(Boolean) as NonNullable<StatRow['paints']>[]

      const brandCounts = new Map<string, number>()
      const typeCounts = new Map<string, number>()

      for (const paint of rows) {
        const brand = paint.product_lines.brands.name
        brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)

        const type = paint.paint_type ?? 'Unknown'
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
      }

      const byBrand = Array.from(brandCounts.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      const byType = Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)

      return { total: rows.length, byBrand, byType }
    },

    /**
     * Searches the user's collection by paint name, hex, brand, or paint type.
     *
     * Filtering is done in JS after fetching all collection rows so that brand
     * name (nested two levels deep) can be matched without a custom DB function.
     * The 250ms debounce on the client limits call frequency.
     *
     * @param userId - The authenticated user's UUID.
     * @param options.query - Search string. Prefix with `#` to match hex codes.
     * @param options.limit - Max results to return (default 24).
     * @returns Matching {@link CollectionPaint} rows, or `[]` on error.
     */
    async searchCollection(
      userId: string,
      { query, limit = 24 }: { query: string; limit?: number },
    ): Promise<CollectionPaint[]> {
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
        if (results.length >= limit) break
      }

      return results
    },
  }
}

/** The collection service instance type. */
export type CollectionService = ReturnType<typeof createCollectionService>
