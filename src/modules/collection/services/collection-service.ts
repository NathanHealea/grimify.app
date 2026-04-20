import type { SupabaseClient } from '@supabase/supabase-js'

import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

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
  }
}

/** The collection service instance type. */
export type CollectionService = ReturnType<typeof createCollectionService>
