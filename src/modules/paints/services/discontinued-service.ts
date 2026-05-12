import type { SupabaseClient } from '@supabase/supabase-js'

import type { PaintWithRelations } from '@/modules/paints/services/paint-service'

/**
 * Options for {@link DiscontinuedService.listDiscontinuedPaints}.
 *
 * @property limit - Maximum number of paints to return. Defaults to 24.
 * @property offset - Number of paints to skip. Defaults to 0.
 */
export type ListDiscontinuedPaintsOptions = {
  limit?: number
  offset?: number
}

/**
 * Creates a discontinued-paint query service bound to the given Supabase
 * client.
 *
 * Encapsulates the two queries that power the `/discontinued` route: a
 * paginated list and a total count. Use the `.server.ts` wrapper to get an
 * instance bound to the server-side client.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with `listDiscontinuedPaints` and
 *   `countDiscontinuedPaints` query methods.
 */
export function createDiscontinuedService(supabase: SupabaseClient) {
  return {
    /**
     * Returns discontinued paints with their joined product line and
     * brand, paginated and ordered alphabetically by name.
     *
     * @param options - Pagination options. See
     *   {@link ListDiscontinuedPaintsOptions}.
     * @returns Array of {@link PaintWithRelations}; empty when no rows match
     *   or on Supabase error.
     */
    async listDiscontinuedPaints(
      options?: ListDiscontinuedPaintsOptions,
    ): Promise<PaintWithRelations[]> {
      const limit = options?.limit ?? 24
      const offset = options?.offset ?? 0

      const { data } = await supabase
        .from('paints')
        .select(`
          *,
          product_lines (
            *,
            brands (*)
          )
        `)
        .eq('is_discontinued', true)
        .order('name')
        .range(offset, offset + limit - 1)

      return (data as PaintWithRelations[] | null) ?? []
    },

    /**
     * Returns the total number of discontinued paints in the catalog.
     *
     * @returns Integer count; falls back to `0` on Supabase error.
     */
    async countDiscontinuedPaints(): Promise<number> {
      const { count } = await supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .eq('is_discontinued', true)

      return count ?? 0
    },
  }
}
