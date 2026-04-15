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
     * Searches paints by name or hex value with optional filters.
     *
     * Name matching uses case-insensitive partial match (`ilike`).
     * If the query starts with `#`, it matches against the `hex` column instead.
     * An optional `hueId` filter combines search with hue group filtering.
     *
     * @param options.query - The search string (name or hex starting with `#`).
     * @param options.hueId - Optional child hue UUID to filter by.
     * @param options.limit - Maximum number of paints to return (default 50).
     * @param options.offset - Number of paints to skip (default 0).
     * @returns An object with matching paints and total count.
     */
    async searchPaints(options: {
      query: string
      hueId?: string
      hueIds?: string[]
      limit?: number
      offset?: number
    }): Promise<{ paints: PaintWithBrand[]; count: number }> {
      const { query, hueId, hueIds, limit = 50, offset = 0 } = options
      const pattern = `%${query}%`

      // Step 1: Find product_line IDs whose brand name matches
      const { data: matchingLines } = await supabase
        .from('product_lines')
        .select('id, brands!inner(name)')
        .ilike('brands.name', pattern)

      const lineIds = matchingLines?.map((l) => l.id) ?? []

      // Step 2: Collect all paint IDs matching name, type, or brand
      // Using three parallel queries to avoid PostgREST .or() string issues
      const idQueries = [
        supabase.from('paints').select('id').ilike('name', pattern),
        supabase.from('paints').select('id').ilike('paint_type', pattern),
      ]
      if (lineIds.length > 0) {
        idQueries.push(
          supabase.from('paints').select('id').in('product_line_id', lineIds)
        )
      }

      const idResults = await Promise.all(idQueries)
      const matchingIds = [
        ...new Set(idResults.flatMap((r) => r.data?.map((p) => p.id) ?? [])),
      ]

      if (matchingIds.length === 0) {
        return { paints: [], count: 0 }
      }

      // Step 3: Fetch matching paints with hue scoping
      let countQuery = supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .in('id', matchingIds)

      let dataQuery = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .in('id', matchingIds)
        .order('name')
        .range(offset, offset + limit - 1)

      if (hueId) {
        countQuery = countQuery.eq('itten_hue_id', hueId)
        dataQuery = dataQuery.eq('itten_hue_id', hueId)
      } else if (hueIds && hueIds.length > 0) {
        countQuery = countQuery.in('itten_hue_id', hueIds)
        dataQuery = dataQuery.in('itten_hue_id', hueIds)
      }

      const [{ count }, { data }] = await Promise.all([countQuery, dataQuery])

      return {
        paints: (data as PaintWithBrand[] | null) ?? [],
        count: count ?? 0,
      }
    },

    /**
     * Returns the total count of paints for a specific child hue.
     *
     * @param hueId - The child hue UUID.
     * @returns The total number of paints assigned to the child hue.
     */
    async getPaintCountByIttenHueId(hueId: string): Promise<number> {
      const { count } = await supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .eq('itten_hue_id', hueId)

      return count ?? 0
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
