import type { SupabaseClient } from '@supabase/supabase-js'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { Brand, Paint, PaintReference, ProductLine } from '@/types/paint'

/** Page size for paginating the full color-wheel paint fetch. PostgREST caps a single response at 1000 rows by default. */
const COLOR_WHEEL_PAGE_SIZE = 1000

/** Paint row joined with its product line and brand. */
export type PaintWithRelations = Paint & {
  product_lines: ProductLine & {
    brands: Brand
  }
}

/** Subset of hue fields returned when joining from a paint row. */
export type PaintHueJoin = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  hex_code: string
}

/** Paint with relations and its ISCC-NBS sub-hue. */
export type PaintWithRelationsAndHue = PaintWithRelations & {
  hues: PaintHueJoin | null
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
     * Fetches paints belonging to a specific hue (sub-hue),
     * including the brand name from the joined product line.
     *
     * @param hueId - The hue UUID.
     * @param options.limit - Maximum number of paints to return.
     * @param options.offset - Number of paints to skip (for pagination).
     * @returns Array of paints with brand info, ordered by name.
     */
    async getPaintsByHueId(
      hueId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<PaintWithBrand[]> {
      let query = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .eq('hue_id', hueId)
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
     * @param parentHueId - The top-level hue UUID.
     * @param options.limit - Maximum number of paints to return.
     * @param options.offset - Number of paints to skip (for pagination).
     * @returns Array of paints with brand info, ordered by name.
     */
    async getPaintsByHueGroup(
      parentHueId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<PaintWithBrand[]> {
      const { data: children } = await supabase
        .from('hues')
        .select('id')
        .eq('parent_id', parentHueId)

      const childIds = children?.map((c) => c.id) ?? []
      if (childIds.length === 0) return []

      let query = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .in('hue_id', childIds)
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
     * @param parentHueId - The top-level hue UUID.
     * @returns The total number of paints in the hue group.
     */
    async getPaintCountByHueGroup(parentHueId: string): Promise<number> {
      const { data: children } = await supabase
        .from('hues')
        .select('id')
        .eq('parent_id', parentHueId)

      const childIds = children?.map((c) => c.id) ?? []
      if (childIds.length === 0) return 0

      const { count } = await supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .in('hue_id', childIds)

      return count ?? 0
    },

    /**
     * Counts the number of paints in each hue group.
     *
     * Uses individual count queries per hue to avoid the default row limit
     * that truncates results when fetching all paint rows client-side.
     *
     * @param hueIds - The hue UUIDs to count paints for.
     * @returns A map of hue_id to paint count.
     */
    async getPaintCountsByHue(hueIds: string[]): Promise<Map<string, number>> {
      const entries = await Promise.all(
        hueIds.map(async (id) => {
          const { count } = await supabase
            .from('paints')
            .select('*', { count: 'exact', head: true })
            .eq('hue_id', id)
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
    async getPaintById(id: string): Promise<PaintWithRelationsAndHue | null> {
      const { data } = await supabase
        .from('paints')
        .select(`
          *,
          product_lines (
            *,
            brands (*)
          ),
          hues (
            id, parent_id, name, slug, hex_code
          )
        `)
        .eq('id', id)
        .single()

      return data as PaintWithRelationsAndHue | null
    },

    /**
     * Returns the total count of paints for a specific child hue.
     *
     * @param hueId - The child hue UUID.
     * @returns The total number of paints assigned to the child hue.
     */
    async getPaintCountByHueId(hueId: string): Promise<number> {
      const { count } = await supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .eq('hue_id', hueId)

      return count ?? 0
    },

    /**
     * Unified search entrypoint for all three paint search surfaces.
     *
     * Handles text search, hue filtering, and optional collection scoping in a
     * single call. When `query` is empty the method still honours hue and scope
     * filters, so callers can unify "filtered browse" and "search" into one call.
     *
     * Cancellation: pass an `AbortSignal` to abort in-flight network requests when
     * a newer search supersedes this one (prevents stale results overwriting fresh ones).
     *
     * @param options.query - Search string matched against name, paint type, and brand name via ilike.
     * @param options.hueIds - Hue UUIDs to filter by. Pass a single ID for a child hue, multiple for a parent group.
     * @param options.scope - `'all'` (default) searches all paints; `{ type: 'userCollection', userId }` scopes to one user's collection.
     * @param options.limit - Maximum number of results (default 50).
     * @param options.offset - Number of results to skip (default 0).
     * @param options.signal - AbortSignal for request cancellation.
     * @returns `{ paints, count }` where `count` is the total matching rows (for pagination).
     */
    async searchPaintsUnified(options: {
      query?: string
      hueIds?: string[]
      scope?: 'all' | { type: 'userCollection'; userId: string }
      limit?: number
      offset?: number
      signal?: AbortSignal
    }): Promise<{ paints: PaintWithBrand[]; count: number }> {
      const { query, hueIds, scope, limit = 50, offset = 0, signal } = options

      // Resolve the base paint ID set for userCollection scope
      let scopePaintIds: string[] | null = null
      if (scope && typeof scope !== 'string' && scope.type === 'userCollection') {
        let q = supabase.from('user_paints').select('paint_id').eq('user_id', scope.userId)
        if (signal) q = q.abortSignal(signal)
        const { data } = await q
        scopePaintIds = data?.map((r) => r.paint_id) ?? []
        if (scopePaintIds.length === 0) return { paints: [], count: 0 }
      }

      if (!query) {
        // Browse mode — no text search, just scope + hue filters
        let countQuery = supabase.from('paints').select('*', { count: 'exact', head: true })
        let dataQuery = supabase
          .from('paints')
          .select('*, product_lines(brands(name))')
          .order('name')
          .range(offset, offset + limit - 1)

        if (scopePaintIds) {
          countQuery = countQuery.in('id', scopePaintIds)
          dataQuery = dataQuery.in('id', scopePaintIds)
        }
        if (hueIds && hueIds.length === 1) {
          countQuery = countQuery.eq('hue_id', hueIds[0])
          dataQuery = dataQuery.eq('hue_id', hueIds[0])
        } else if (hueIds && hueIds.length > 1) {
          countQuery = countQuery.in('hue_id', hueIds)
          dataQuery = dataQuery.in('hue_id', hueIds)
        }
        if (signal) {
          countQuery = countQuery.abortSignal(signal)
          dataQuery = dataQuery.abortSignal(signal)
        }

        const [{ count }, { data }] = await Promise.all([countQuery, dataQuery])
        return {
          paints: (data as PaintWithBrand[] | null) ?? [],
          count: count ?? 0,
        }
      }

      // Search mode — apply filters directly to avoid large .in(id) lists that
      // overflow PostgREST URL length limits when hundreds of IDs match.
      const pattern = `%${query}%`

      // Brand-name matches produce a small list of product_line IDs (one per line).
      const { data: matchingLines } = await supabase
        .from('product_lines')
        .select('id, brands!inner(name)')
        .ilike('brands.name', pattern)

      const lineIds = matchingLines?.map((l) => l.id) ?? []

      // Build a single OR filter: name match, type match, or brand-via-product-line.
      const orParts = [`name.ilike.${pattern}`, `paint_type.ilike.${pattern}`]
      if (lineIds.length > 0) {
        orParts.push(`product_line_id.in.(${lineIds.join(',')})`)
      }
      const orFilter = orParts.join(',')

      let countQuery = supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .or(orFilter)

      let dataQuery = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .or(orFilter)
        .order('name')
        .range(offset, offset + limit - 1)

      // Scope to user collection if needed
      if (scopePaintIds) {
        countQuery = countQuery.in('id', scopePaintIds)
        dataQuery = dataQuery.in('id', scopePaintIds)
      }

      if (hueIds && hueIds.length === 1) {
        countQuery = countQuery.eq('hue_id', hueIds[0])
        dataQuery = dataQuery.eq('hue_id', hueIds[0])
      } else if (hueIds && hueIds.length > 1) {
        countQuery = countQuery.in('hue_id', hueIds)
        dataQuery = dataQuery.in('hue_id', hueIds)
      }
      if (signal) {
        countQuery = countQuery.abortSignal(signal)
        dataQuery = dataQuery.abortSignal(signal)
      }

      const [{ count }, { data }] = await Promise.all([countQuery, dataQuery])
      return {
        paints: (data as PaintWithBrand[] | null) ?? [],
        count: count ?? 0,
      }
    },

    /**
     * Fetches all non-discontinued paints with the fields needed to render the
     * color wheel: position data (hue, saturation, lightness), display data
     * (hex, is_metallic), and tooltip data (brand name, product line name).
     *
     * Paginates through results in batches of {@link COLOR_WHEEL_PAGE_SIZE} to
     * bypass PostgREST's default 1000-row response cap, which would otherwise
     * silently truncate the wheel when the catalog grows past that threshold.
     *
     * @returns Array of {@link ColorWheelPaint} ordered by hue ascending.
     */
    async getColorWheelPaints(): Promise<ColorWheelPaint[]> {
      const all: ColorWheelPaint[] = []
      let offset = 0

      while (true) {
        const { data } = await supabase
          .from('paints')
          .select('id, name, hex, hue, saturation, lightness, hue_id, is_metallic, paint_type, product_line_id, product_lines!inner(id, name, brands!inner(id, name))')
          .eq('is_discontinued', false)
          .order('hue', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + COLOR_WHEEL_PAGE_SIZE - 1)

        if (!data || data.length === 0) break

        for (const row of data) {
          const line = row.product_lines as unknown as { id: string; name: string; brands: { id: string; name: string } }
          all.push({
            id: row.id,
            name: row.name,
            hex: row.hex,
            hue: row.hue,
            saturation: row.saturation,
            lightness: row.lightness,
            hue_id: row.hue_id,
            is_metallic: row.is_metallic,
            paint_type: row.paint_type,
            product_line_id: row.product_line_id,
            brand_name: line.brands.name,
            product_line_name: line.name,
            brand_id: line.brands.id,
          })
        }

        if (data.length < COLOR_WHEEL_PAGE_SIZE) break
        offset += COLOR_WHEEL_PAGE_SIZE
      }

      return all
    },

    /**
     * Fetches all non-discontinued paints whose `hue_id` belongs to the given
     * principal hue group (the principal itself plus all its ISCC-NBS sub-hues).
     *
     * Used to populate the hue-swap dialog candidate grid.
     *
     * @param parentHueId - UUID of the top-level Munsell principal hue.
     * @returns Array of {@link ColorWheelPaint} ordered by name.
     */
    async listColorWheelPaintsByHueGroup(parentHueId: string): Promise<ColorWheelPaint[]> {
      const { data: children } = await supabase
        .from('hues')
        .select('id')
        .eq('parent_id', parentHueId)

      const hueIds = [parentHueId, ...(children?.map((c) => c.id) ?? [])]

      const { data } = await supabase
        .from('paints')
        .select('id, name, hex, hue, saturation, lightness, hue_id, is_metallic, paint_type, product_line_id, product_lines!inner(id, name, brands!inner(id, name))')
        .in('hue_id', hueIds)
        .eq('is_discontinued', false)
        .order('name', { ascending: true })

      if (!data) return []

      return data.map((row) => {
        const line = row.product_lines as unknown as { id: string; name: string; brands: { id: string; name: string } }
        return {
          id: row.id,
          name: row.name,
          hex: row.hex,
          hue: row.hue,
          saturation: row.saturation,
          lightness: row.lightness,
          hue_id: row.hue_id,
          is_metallic: row.is_metallic,
          paint_type: row.paint_type,
          product_line_id: row.product_line_id,
          brand_name: line.brands.name,
          product_line_name: line.name,
          brand_id: line.brands.id,
        }
      })
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
