import type { SupabaseClient } from '@supabase/supabase-js'

import type { Brand, Paint, PaintReference, ProductLine } from '@/types/paint'

/** Paint row joined with its product line and brand. */
export type PaintWithRelations = Paint & {
  product_lines: ProductLine & {
    brands: Brand
  }
}

/** A paint reference row with the related paint joined (including its product line and brand). */
export type PaintReferenceWithRelated = PaintReference & {
  related_paint: PaintWithRelations
}

/** Paint row with brand name from the joined product line. */
export type PaintWithBrand = Paint & {
  product_lines: {
    brands: {
      name: string
    }
  }
}

/** Minimal paint projection for color group counting. */
export type PaintHueSaturation = {
  hue: number
  saturation: number
}

/**
 * Creates a paint service bound to the given Supabase client.
 *
 * All paint-related queries are encapsulated here. Use the `.server.ts`
 * or `.client.ts` wrappers to obtain an instance with the correct client.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with paint query methods.
 */
export function createPaintService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches hue and saturation values for all paints.
     *
     * @returns Array of paint hue/saturation pairs, or an empty array on error.
     */
    async getAllPaintHueSaturation(): Promise<PaintHueSaturation[]> {
      const { data } = await supabase.from('paints').select('hue, saturation')
      return data ?? []
    },

    /**
     * Fetches paints ordered alphabetically by name with pagination,
     * including the brand name from the joined product line.
     *
     * @param options.limit - Maximum number of paints to return.
     * @param options.offset - Number of paints to skip.
     * @returns Array of paints with brand info, ordered by name.
     */
    async getAllPaints(options?: { limit?: number; offset?: number }): Promise<PaintWithBrand[]> {
      const limit = options?.limit ?? 48
      const offset = options?.offset ?? 0

      const { data } = await supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .order('name')
        .range(offset, offset + limit - 1)

      return (data as PaintWithBrand[] | null) ?? []
    },

    /**
     * Returns the total count of all paints.
     *
     * @returns The total number of paints in the database.
     */
    async getTotalPaintCount(): Promise<number> {
      const { count } = await supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })

      return count ?? 0
    },

    /**
     * Fetches all paints that fall within a hue range (or below a saturation
     * threshold for neutrals), ordered by hue then name.
     *
     * For wrapping hue ranges (e.g., Reds: 345-15), the query uses an OR
     * condition. Neutrals are identified by saturation below the given threshold.
     */
    async getPaintsByColorGroup({
      hueMin,
      hueMax,
      isNeutral,
      saturationThreshold,
    }: {
      hueMin?: number
      hueMax?: number
      isNeutral?: boolean
      saturationThreshold: number
    }): Promise<Paint[]> {
      let query = supabase.from('paints').select('*')

      if (isNeutral) {
        query = query.lt('saturation', saturationThreshold)
      } else if (hueMin !== undefined && hueMax !== undefined) {
        query = query.gte('saturation', saturationThreshold)
        if (hueMin > hueMax) {
          // Wrapping range (e.g., Reds: 345-15)
          query = query.or(`hue.gte.${hueMin},hue.lt.${hueMax}`)
        } else {
          query = query.gte('hue', hueMin).lt('hue', hueMax)
        }
      }

      const { data } = await query.order('hue').order('name')
      return data ?? []
    },

    /**
     * Fetches paints belonging to a specific Itten hue group,
     * including the brand name from the joined product line.
     *
     * @param hueId - The Itten hue UUID.
     * @param options.limit - Maximum number of paints to return.
     * @param options.offset - Number of paints to skip (for pagination).
     * @returns Array of paints with brand info, ordered by name.
     */
    async getPaintsByIttenHueId(
      hueId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<PaintWithBrand[]> {
      let query = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .eq('itten_hue_id', hueId)
        .order('name')

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit ?? 50) - 1
        )
      } else if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data } = await query
      return (data as PaintWithBrand[] | null) ?? []
    },

    /**
     * Fetches paints belonging to any child hue of a top-level hue group,
     * including the brand name from the joined product line.
     *
     * @param parentHueId - The top-level Itten hue UUID.
     * @param options.limit - Maximum number of paints to return.
     * @param options.offset - Number of paints to skip (for pagination).
     * @returns Array of paints with brand info, ordered by name.
     */
    async getPaintsByHueGroup(
      parentHueId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<PaintWithBrand[]> {
      const { data: children } = await supabase
        .from('itten_hues')
        .select('id')
        .eq('parent_id', parentHueId)

      const childIds = children?.map((c) => c.id) ?? []
      if (childIds.length === 0) return []

      let query = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .in('itten_hue_id', childIds)
        .order('name')

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit ?? 50) - 1
        )
      } else if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data } = await query
      return (data as PaintWithBrand[] | null) ?? []
    },

    /**
     * Returns the total count of paints for a top-level hue group
     * (all paints assigned to any child hue of the given parent).
     *
     * @param parentHueId - The top-level Itten hue UUID.
     * @returns The total number of paints in the hue group.
     */
    async getPaintCountByHueGroup(parentHueId: string): Promise<number> {
      const { data: children } = await supabase
        .from('itten_hues')
        .select('id')
        .eq('parent_id', parentHueId)

      const childIds = children?.map((c) => c.id) ?? []
      if (childIds.length === 0) return 0

      const { count } = await supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .in('itten_hue_id', childIds)

      return count ?? 0
    },

    /**
     * Counts the number of paints in each Itten hue group.
     *
     * Uses individual count queries per hue to avoid the default row limit
     * that truncates results when fetching all paint rows client-side.
     *
     * @param hueIds - The Itten hue UUIDs to count paints for.
     * @returns A map of itten_hue_id → paint count.
     */
    async getPaintCountsByIttenHue(hueIds: string[]): Promise<Map<string, number>> {
      const entries = await Promise.all(
        hueIds.map(async (id) => {
          const { count } = await supabase
            .from('paints')
            .select('*', { count: 'exact', head: true })
            .eq('itten_hue_id', id)
          return [id, count ?? 0] as const
        })
      )
      return new Map(entries)
    },

    /**
     * Fetches a single paint by ID with its product line and brand joined.
     *
     * @param id - The paint's UUID.
     * @returns The paint with relations, or `null` if not found.
     */
    async getPaintById(id: string): Promise<PaintWithRelations | null> {
      const { data } = await supabase
        .from('paints')
        .select(`
          *,
          product_lines (
            *,
            brands (*)
          )
        `)
        .eq('id', id)
        .single()

      return data as PaintWithRelations | null
    },

    /**
     * Fetches all paint references for a given paint, with the related paint
     * data joined (including product line and brand).
     *
     * @param paintId - The source paint's UUID.
     * @returns Array of references with related paint data, or an empty array on error.
     */
    async getPaintReferences(paintId: string): Promise<PaintReferenceWithRelated[]> {
      const { data } = await supabase
        .from('paint_references')
        .select(`
          *,
          related_paint:paints!related_paint_id (
            *,
            product_lines (
              *,
              brands (*)
            )
          )
        `)
        .eq('paint_id', paintId)

      return (data as PaintReferenceWithRelated[] | null) ?? []
    },
  }
}

/** The paint service instance type. */
export type PaintService = ReturnType<typeof createPaintService>
