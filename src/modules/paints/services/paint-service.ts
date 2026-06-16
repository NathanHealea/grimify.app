import type { SupabaseClient } from '@supabase/supabase-js'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { PaintFacetCounts } from '@/modules/paints/types/paint-facet-counts'
import { UNTYPED_PAINT_TYPE } from '@/modules/paints/types/similar-paints-filter-state'
import type { Brand, Paint, PaintReference, ProductLine } from '@/types/paint'

/** Page size for paginating the full color-wheel paint fetch. PostgREST caps a single response at 1000 rows by default. */
const COLOR_WHEEL_PAGE_SIZE = 1000

/** Paint row joined with its product line and brand. */
export type PaintWithRelations = Paint & {
  product_lines: ProductLine & {
    brands: Brand
  }
}

/**
 * Paint row returned by {@link searchPaints} for the admin list view.
 *
 * Includes product line name and the assigned hue for rendering the full
 * admin paint table. `hues` is `null` when no hue is assigned to the paint.
 */
export type PaintListRow = Paint & {
  product_lines: {
    name: string
    brands: {
      name: string
    }
  }
  /** The hue assigned to this paint. `null` when no hue has been assigned. */
  hues: {
    name: string
    hex_code: string
  } | null
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
 * Applies `ORDER BY` clauses to a Supabase query based on the requested sort
 * field and direction.
 *
 * Tie-breakers are appended after the primary column so results are stable
 * across pages when many paints share the same primary value:
 *
 * - `hue` → `hue`, `lightness`, `name`, `id`
 * - `lightness` → `lightness`, `hue`, `name`, `id`
 * - `contrast` → `relative_luminance` (generated column), `hue`, `name`, `id`
 * - `name` (default) → `name`, `id`
 *
 * @param query - The PostgREST query builder to chain orders onto.
 * @param sortBy - Primary sort field (default `'name'`).
 * @param sortDir - Sort direction (default `'asc'`).
 * @returns The same query with all `.order()` calls appended.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort<Q extends { order: (...args: any[]) => Q }>(
  query: Q,
  sortBy: 'name' | 'hue' | 'lightness' | 'contrast' = 'name',
  sortDir: 'asc' | 'desc' = 'asc',
): Q {
  const asc = sortDir === 'asc'
  if (sortBy === 'hue') {
    return query
      .order('hue', { ascending: asc })
      .order('lightness', { ascending: true })
      .order('name', { ascending: true })
      .order('id', { ascending: true })
  }
  if (sortBy === 'lightness') {
    return query
      .order('lightness', { ascending: asc })
      .order('hue', { ascending: true })
      .order('name', { ascending: true })
      .order('id', { ascending: true })
  }
  if (sortBy === 'contrast') {
    return query
      .order('relative_luminance', { ascending: asc })
      .order('hue', { ascending: true })
      .order('name', { ascending: true })
      .order('id', { ascending: true })
  }
  // Default: name
  return query
    .order('name', { ascending: asc })
    .order('id', { ascending: true })
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
  /** Paginates through all paints to collect every distinct non-null paint_type string. */
  async function fetchDistinctPaintTypes(): Promise<string[]> {
    const seen = new Set<string>()
    const pageSize = COLOR_WHEEL_PAGE_SIZE
    let offset = 0

    while (true) {
      const { data } = await supabase
        .from('paints')
        .select('paint_type')
        .not('paint_type', 'is', null)
        .order('paint_type', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (!data || data.length === 0) break

      for (const row of data) {
        const t = (row as { paint_type: string | null }).paint_type
        if (t != null && t.trim().length > 0) seen.add(t.trim())
      }

      if (data.length < pageSize) break
      offset += pageSize
    }

    return Array.from(seen).sort((a, b) => a.localeCompare(b))
  }

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
     * Searches paints with optional text search and brand filter, with pagination.
     *
     * When `search` is provided, matches against paint name via ilike.
     * When `brandId` is provided, limits results to paints in that brand's product lines.
     * Returns both the paginated page of results and the total matching count so
     * callers can render accurate pagination without a separate unfiltered count call.
     *
     * @param options.search - Optional text to search in paint names.
     * @param options.brandId - Optional brand ID to filter by.
     * @param options.limit - Maximum number of paints to return (default 50).
     * @param options.offset - Number of paints to skip (default 0).
     * @returns `{ paints, count }` where `count` is the total filtered row count.
     */
    async searchPaints(options: {
      search?: string
      brandId?: number
      limit?: number
      offset?: number
    }): Promise<{ paints: PaintListRow[]; count: number }> {
      const { search, brandId, limit = 50, offset = 0 } = options

      let countQuery = supabase
        .from('paints')
        .select('*, product_lines!inner(brand_id)', { count: 'exact', head: true })

      let dataQuery = supabase
        .from('paints')
        .select('*, product_lines!inner(name, brands(name)), hues(name, hex_code)')
        .order('name')
        .range(offset, offset + limit - 1)

      if (search) {
        countQuery = countQuery.ilike('name', `%${search}%`)
        dataQuery = dataQuery.ilike('name', `%${search}%`)
      }

      if (brandId) {
        countQuery = countQuery.eq('product_lines.brand_id', brandId)
        dataQuery = dataQuery.eq('product_lines.brand_id', brandId)
      }

      const [{ count }, { data }] = await Promise.all([countQuery, dataQuery])
      return {
        paints: (data as PaintListRow[] | null) ?? [],
        count: count ?? 0,
      }
    },

    /**
     * Fetches paints that have no hue assignment (`hue_id IS NULL`), with optional
     * name search and pagination.
     *
     * Used by the admin add-paints-to-hue flow to present candidate paints for
     * assignment. Scoping to unassigned paints prevents silently re-homing a
     * paint already assigned to another hue.
     *
     * @param options.query - Optional case-insensitive name search via ilike.
     * @param options.limit - Maximum number of paints to return (default 50).
     * @param options.offset - Number of paints to skip (default 0).
     * @returns `{ paints, count }` where `count` is the total unassigned matching rows.
     */
    async getPaintsWithoutHue(options: {
      query?: string
      limit?: number
      offset?: number
    }): Promise<{ paints: PaintWithBrand[]; count: number }> {
      const { query, limit = 50, offset = 0 } = options

      let countQuery = supabase
        .from('paints')
        .select('*', { count: 'exact', head: true })
        .is('hue_id', null)

      let dataQuery = supabase
        .from('paints')
        .select('*, product_lines(brands(name))')
        .is('hue_id', null)
        .order('name')
        .range(offset, offset + limit - 1)

      if (query) {
        countQuery = countQuery.ilike('name', `%${query}%`)
        dataQuery = dataQuery.ilike('name', `%${query}%`)
      }

      const [{ count }, { data }] = await Promise.all([countQuery, dataQuery])
      return {
        paints: (data as PaintWithBrand[] | null) ?? [],
        count: count ?? 0,
      }
    },

    /**
     * Fetches all paints whose `hue_id` is in the provided list of hue IDs.
     *
     * Used by the admin hue detail page to show paints associated with a hue
     * or any of its child hues.
     *
     * @param hueIds - Array of hue UUIDs to filter by.
     * @returns Array of paints with relations, ordered by name.
     */
    async getPaintsByHueIds(hueIds: string[]): Promise<PaintWithRelations[]> {
      if (hueIds.length === 0) return []

      const { data } = await supabase
        .from('paints')
        .select('*, product_lines(*, brands(*))')
        .in('hue_id', hueIds)
        .order('name')

      return (data as PaintWithRelations[] | null) ?? []
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
     * @param options.brandIds - Brand IDs to filter by (OR within dimension).
     * @param options.paintTypes - `paint_type` strings to filter by (OR within dimension).
     *   Use `'Untyped'` to represent paints with `paint_type === null`.
     * @param options.productLineIds - Product-line IDs to filter by (OR within dimension).
     * @param options.discontinued - Tri-state for `is_discontinued`:
     *   `'include'` (default, no constraint) | `'exclude'` (active only) | `'only'`.
     * @param options.metallicOnly - When `true`, only `is_metallic = true` paints are returned.
     * @param options.limit - Maximum number of results (default 50).
     * @param options.offset - Number of results to skip (default 0).
     * @param options.signal - AbortSignal for request cancellation.
     * @param options.sortBy - Column to sort results by (default `'name'`).
     *   `'contrast'` maps to the generated `relative_luminance` column
     *   (`0.2126·r + 0.7152·g + 0.0722·b`). See {@link applySort}.
     * @param options.sortDir - Sort direction (default `'asc'`).
     * @returns `{ paints, count }` where `count` is the total matching rows (for pagination).
     */
    async searchPaintsUnified(options: {
      query?: string
      hueIds?: string[]
      scope?: 'all' | { type: 'userCollection'; userId: string }
      brandIds?: number[]
      paintTypes?: string[]
      productLineIds?: number[]
      discontinued?: 'include' | 'exclude' | 'only'
      metallicOnly?: boolean
      limit?: number
      offset?: number
      signal?: AbortSignal
      sortBy?: 'name' | 'hue' | 'lightness' | 'contrast'
      sortDir?: 'asc' | 'desc'
    }): Promise<{ paints: PaintWithBrand[]; count: number }> {
      const {
        query,
        hueIds,
        scope,
        brandIds,
        paintTypes,
        productLineIds,
        discontinued,
        metallicOnly,
        limit = 50,
        offset = 0,
        signal,
        sortBy = 'name',
        sortDir = 'asc',
      } = options

      // Resolve the base paint ID set for userCollection scope
      let scopePaintIds: string[] | null = null
      if (scope && typeof scope !== 'string' && scope.type === 'userCollection') {
        let q = supabase.from('user_paints').select('paint_id').eq('user_id', scope.userId)
        if (signal) q = q.abortSignal(signal)
        const { data } = await q
        scopePaintIds = data?.map((r) => r.paint_id) ?? []
        if (scopePaintIds.length === 0) return { paints: [], count: 0 }
      }

      /**
       * Applies shared dimension filters (brand, type, line, discontinued,
       * metallic) to a Supabase query. Both browse and search paths call this
       * to ensure consistent filter behaviour.
       */
      function applyDimensionFilters(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        q: any,
        opts: {
          brandIds?: number[]
          paintTypes?: string[]
          productLineIds?: number[]
          discontinued?: 'include' | 'exclude' | 'only'
          metallicOnly?: boolean
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ): any {
        // Brand filter via product_lines join
        if (opts.brandIds && opts.brandIds.length > 0) {
          q = q.in('product_lines.brand_id', opts.brandIds)
        }

        // Paint type filter — handle Untyped sentinel and mixed null+value cases
        if (opts.paintTypes && opts.paintTypes.length > 0) {
          const hasUntyped = opts.paintTypes.includes(UNTYPED_PAINT_TYPE)
          const concreteTypes = opts.paintTypes.filter((t) => t !== UNTYPED_PAINT_TYPE)

          if (hasUntyped && concreteTypes.length > 0) {
            q = q.or(`paint_type.in.(${concreteTypes.join(',')}),paint_type.is.null`)
          } else if (hasUntyped) {
            q = q.is('paint_type', null)
          } else {
            q = q.in('paint_type', concreteTypes)
          }
        }

        // Product line filter
        if (opts.productLineIds && opts.productLineIds.length > 0) {
          q = q.in('product_line_id', opts.productLineIds)
        }

        // Discontinued tri-state
        if (opts.discontinued === 'exclude') {
          q = q.eq('is_discontinued', false)
        } else if (opts.discontinued === 'only') {
          q = q.eq('is_discontinued', true)
        }

        // Metallic only
        if (opts.metallicOnly) {
          q = q.eq('is_metallic', true)
        }

        return q
      }

      const dimFilters = { brandIds, paintTypes, productLineIds, discontinued, metallicOnly }
      const hasBrandFilter = brandIds && brandIds.length > 0

      if (!query) {
        // Browse mode — no text search, just scope + hue + dimension filters.
        // Use product_lines!inner when brand filtering is active so the join
        // works correctly; fall back to a regular join otherwise.
        const selectFragment = hasBrandFilter
          ? '*, product_lines!inner(brand_id, brands(name))'
          : '*, product_lines(brands(name))'

        const countSelectFragment = hasBrandFilter
          ? '*, product_lines!inner(brand_id)'
          : '*'
        let countQuery = supabase
          .from('paints')
          .select(countSelectFragment, { count: 'exact', head: true })
        let dataQuery = applySort(
          supabase.from('paints').select(selectFragment),
          sortBy,
          sortDir,
        ).range(offset, offset + limit - 1)

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

        countQuery = applyDimensionFilters(countQuery, dimFilters)
        dataQuery = applyDimensionFilters(dataQuery, dimFilters)

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

      const searchSelectFragment = hasBrandFilter
        ? '*, product_lines!inner(brand_id, brands(name))'
        : '*, product_lines(brands(name))'

      let countQuery = supabase
        .from('paints')
        .select(
          hasBrandFilter ? '*, product_lines!inner(brand_id)' : '*',
          { count: 'exact', head: true }
        )
        .or(orFilter)

      let dataQuery = applySort(
        supabase.from('paints').select(searchSelectFragment).or(orFilter),
        sortBy,
        sortDir,
      ).range(offset, offset + limit - 1)

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

      countQuery = applyDimensionFilters(countQuery, dimFilters)
      dataQuery = applyDimensionFilters(dataQuery, dimFilters)

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
     * Computes per-option paint counts for each filter dimension, given a
     * current filter context with each dimension held out in turn.
     *
     * Each count reflects how many paints would match if the user added that
     * specific option to the existing active filters for all OTHER dimensions.
     * All per-option queries run in parallel for minimal wall-clock latency.
     *
     * @remarks
     * This uses the strategy-A (server-recompute) approach described in the
     * Paint Explorer Filters feature doc. If per-option count latency becomes
     * a problem, this can be replaced with a client-side narrowing approach
     * (strategy B) without changing the caller API or URL contract.
     *
     * @param filters.query - Optional text search string.
     * @param filters.hueIds - Active hue UUIDs.
     * @param filters.brandIds - Active brand IDs (held out when counting brand options).
     * @param filters.paintTypes - Active paint type strings (held out when counting type options).
     * @param filters.productLineIds - Active product line IDs (held out when counting line options).
     * @param filters.discontinued - Active discontinued tri-state.
     * @param filters.metallicOnly - Active metallic filter.
     * @returns {@link PaintFacetCounts} with per-option counts for brand, type, and line.
     */
    async getPaintFacetCounts(filters: {
      query?: string
      hueIds?: string[]
      brandIds?: number[]
      paintTypes?: string[]
      productLineIds?: number[]
      discontinued?: 'include' | 'exclude' | 'only'
      metallicOnly?: boolean
    }): Promise<PaintFacetCounts> {
      const {
        query,
        hueIds,
        brandIds,
        paintTypes,
        productLineIds,
        discontinued,
        metallicOnly,
      } = filters

      // Fetch option lists needed for counting
      const [allBrands, allPaintTypes, allProductLines] = await Promise.all([
        // All brands for the brand counts
        supabase.from('brands').select('id, name').order('name').then(({ data }) => data ?? []),
        // All distinct non-null paint types (paginated — avoids PostgREST row-limit truncation)
        fetchDistinctPaintTypes(),
        // Product lines for selected brands only (line popover is brand-gated)
        brandIds && brandIds.length > 0
          ? supabase
              .from('product_lines')
              .select('id, brand_id, name')
              .in('brand_id', brandIds)
              .order('name')
              .then(({ data }) => data ?? [])
          : Promise.resolve([] as { id: number; brand_id: number; name: string }[]),
      ])

      // Brand counts: hold out brandIds, apply all other dimension filters
      const brandCountEntries = await Promise.all(
        allBrands.map(async (brand) => {
          let q = supabase
            .from('paints')
            .select('*, product_lines!inner(brand_id)', { count: 'exact', head: true })
            .eq('product_lines.brand_id', brand.id)

          if (hueIds && hueIds.length === 1) q = q.eq('hue_id', hueIds[0])
          else if (hueIds && hueIds.length > 1) q = q.in('hue_id', hueIds)

          if (query) {
            const pattern = `%${query}%`
            q = q.or(`name.ilike.${pattern},paint_type.ilike.${pattern}`)
          }

          if (paintTypes && paintTypes.length > 0) {
            const hasUntyped = paintTypes.includes(UNTYPED_PAINT_TYPE)
            const concreteTypes = paintTypes.filter((t) => t !== UNTYPED_PAINT_TYPE)
            if (hasUntyped && concreteTypes.length > 0) {
              q = q.or(`paint_type.in.(${concreteTypes.join(',')}),paint_type.is.null`)
            } else if (hasUntyped) {
              q = q.is('paint_type', null)
            } else {
              q = q.in('paint_type', concreteTypes)
            }
          }

          if (productLineIds && productLineIds.length > 0) q = q.in('product_line_id', productLineIds)
          if (discontinued === 'exclude') q = q.eq('is_discontinued', false)
          else if (discontinued === 'only') q = q.eq('is_discontinued', true)
          if (metallicOnly) q = q.eq('is_metallic', true)

          const { count: c } = await q
          return [String(brand.id), c ?? 0] as const
        })
      )

      // Type counts: hold out paintTypes, keep all others
      const typeCountEntries = await Promise.all(
        allPaintTypes.map(async (type) => {
          let q = supabase
            .from('paints')
            .select(
              brandIds && brandIds.length > 0
                ? '*, product_lines!inner(brand_id)'
                : '*',
              { count: 'exact', head: true }
            )
            .eq('paint_type', type)

          // Brand filter
          if (brandIds && brandIds.length > 0) {
            q = q.in('product_lines.brand_id', brandIds)
          }

          // Hue filter
          if (hueIds && hueIds.length === 1) q = q.eq('hue_id', hueIds[0])
          else if (hueIds && hueIds.length > 1) q = q.in('hue_id', hueIds)

          // Text search
          if (query) {
            const pattern = `%${query}%`
            q = q.or(`name.ilike.${pattern},paint_type.ilike.${pattern}`)
          }

          // Product line filter
          if (productLineIds && productLineIds.length > 0) {
            q = q.in('product_line_id', productLineIds)
          }

          // Discontinued
          if (discontinued === 'exclude') q = q.eq('is_discontinued', false)
          else if (discontinued === 'only') q = q.eq('is_discontinued', true)

          // Metallic
          if (metallicOnly) q = q.eq('is_metallic', true)

          const { count: c } = await q
          return [type.toLowerCase(), c ?? 0] as const
        })
      )

      // Also count paints with null paint_type (the "Untyped" sentinel)
      const untypedCount = await (async () => {
        let q = supabase
          .from('paints')
          .select(
            brandIds && brandIds.length > 0
              ? '*, product_lines!inner(brand_id)'
              : '*',
            { count: 'exact', head: true }
          )
          .is('paint_type', null)

        if (brandIds && brandIds.length > 0) q = q.in('product_lines.brand_id', brandIds)
        if (hueIds && hueIds.length === 1) q = q.eq('hue_id', hueIds[0])
        else if (hueIds && hueIds.length > 1) q = q.in('hue_id', hueIds)
        if (query) {
          const pattern = `%${query}%`
          q = q.or(`name.ilike.${pattern}`)
        }
        if (productLineIds && productLineIds.length > 0) q = q.in('product_line_id', productLineIds)
        if (discontinued === 'exclude') q = q.eq('is_discontinued', false)
        else if (discontinued === 'only') q = q.eq('is_discontinued', true)
        if (metallicOnly) q = q.eq('is_metallic', true)

        const { count: c } = await q
        return c ?? 0
      })()

      // Line counts: hold out productLineIds, keep all others (only when brands selected).
      // product_line_id already implies the brand — no join needed for the count query.
      const lineCountEntries = await Promise.all(
        allProductLines.map(async (line) => {
          let q = supabase
            .from('paints')
            .select('*', { count: 'exact', head: true })
            .eq('product_line_id', line.id)

          if (hueIds && hueIds.length === 1) q = q.eq('hue_id', hueIds[0])
          else if (hueIds && hueIds.length > 1) q = q.in('hue_id', hueIds)

          if (query) {
            const pattern = `%${query}%`
            q = q.or(`name.ilike.${pattern},paint_type.ilike.${pattern}`)
          }

          if (paintTypes && paintTypes.length > 0) {
            const hasUntyped = paintTypes.includes(UNTYPED_PAINT_TYPE)
            const concreteTypes = paintTypes.filter((t) => t !== UNTYPED_PAINT_TYPE)
            if (hasUntyped && concreteTypes.length > 0) {
              q = q.or(`paint_type.in.(${concreteTypes.join(',')}),paint_type.is.null`)
            } else if (hasUntyped) {
              q = q.is('paint_type', null)
            } else {
              q = q.in('paint_type', concreteTypes)
            }
          }

          if (discontinued === 'exclude') q = q.eq('is_discontinued', false)
          else if (discontinued === 'only') q = q.eq('is_discontinued', true)
          if (metallicOnly) q = q.eq('is_metallic', true)

          const { count: c } = await q
          return [String(line.id), c ?? 0] as const
        })
      )

      return {
        brand: Object.fromEntries(brandCountEntries),
        type: {
          ...Object.fromEntries(typeCountEntries),
          [UNTYPED_PAINT_TYPE.toLowerCase()]: untypedCount,
        },
        line: Object.fromEntries(lineCountEntries),
      }
    },

    /**
     * Fetches paints with the fields needed to render the color wheel and
     * power cross-brand matching: position data (hue, saturation, lightness),
     * display data (hex, is_metallic), classification (is_discontinued), and
     * tooltip data (brand name, product line name).
     *
     * Paginates through results in batches of {@link COLOR_WHEEL_PAGE_SIZE} to
     * bypass PostgREST's default 1000-row response cap, which would otherwise
     * silently truncate the wheel when the catalog grows past that threshold.
     *
     * @param options.includeDiscontinued - When `true`, include discontinued
     *   paints in the result. Defaults to `false` — the standard color-wheel
     *   render and the match engine's default scoping both exclude them.
     * @returns Array of {@link ColorWheelPaint} ordered by hue ascending.
     */
    async getColorWheelPaints(options?: { includeDiscontinued?: boolean }): Promise<ColorWheelPaint[]> {
      const includeDiscontinued = options?.includeDiscontinued ?? false
      const all: ColorWheelPaint[] = []
      let offset = 0

      while (true) {
        let query = supabase
          .from('paints')
          .select('id, name, hex, hue, saturation, lightness, hue_id, is_metallic, is_discontinued, paint_type, product_line_id, product_lines!inner(id, name, brands!inner(id, name))')
          .order('hue', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + COLOR_WHEEL_PAGE_SIZE - 1)

        if (!includeDiscontinued) {
          query = query.eq('is_discontinued', false)
        }

        const { data } = await query

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
            is_discontinued: row.is_discontinued ?? false,
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
        .select('id, name, hex, hue, saturation, lightness, hue_id, is_metallic, is_discontinued, paint_type, product_line_id, product_lines!inner(id, name, brands!inner(id, name))')
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
          is_discontinued: row.is_discontinued ?? false,
          paint_type: row.paint_type,
          product_line_id: row.product_line_id,
          brand_name: line.brands.name,
          product_line_name: line.name,
          brand_id: line.brands.id,
        }
      })
    },

    /**
     * Fetches the distinct, non-null `paint_type` strings across the catalog.
     *
     * Used to populate the paint-type multi-select on the Similar Paints
     * section of the paint detail page. Paginates defensively so the result
     * is not truncated by PostgREST's default response cap, then dedupes and
     * sorts alphabetically.
     *
     * @returns Distinct paint-type strings, sorted alphabetically. Excludes
     *   `null` and empty strings.
     */
    listDistinctPaintTypes(): Promise<string[]> {
      return fetchDistinctPaintTypes()
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
