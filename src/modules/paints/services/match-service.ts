import type { SupabaseClient } from '@supabase/supabase-js'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { createPaintService } from '@/modules/paints/services/paint-service'
import type { MatchOptions } from '@/modules/paints/types/match-options'
import type { PaintMatch } from '@/modules/paints/types/paint-match'
import { rankPaintsByDeltaE } from '@/modules/paints/utils/rank-paints-by-delta-e'

/** Default maximum number of matches returned when {@link MatchOptions.limit} is unset. */
const DEFAULT_MATCH_LIMIT = 10

/** Hard ceiling on the number of matches returned, regardless of caller input. */
const MAX_MATCH_LIMIT = 50

/**
 * Clamps a raw limit into the supported `[1, MAX_MATCH_LIMIT]` range,
 * falling back to {@link DEFAULT_MATCH_LIMIT} when the input is undefined.
 */
function resolveLimit(raw: number | undefined): number {
  if (raw === undefined) return DEFAULT_MATCH_LIMIT
  if (!Number.isFinite(raw)) return DEFAULT_MATCH_LIMIT
  return Math.max(1, Math.min(MAX_MATCH_LIMIT, Math.trunc(raw)))
}

/**
 * Applies in-memory {@link MatchOptions} filters to a candidate pool relative
 * to a single source paint.
 *
 * - Excludes the source paint when `excludeSamePaint`.
 * - Excludes paints from the source's own brand when `excludeSameBrand`.
 * - Restricts to `brandIds` when that array is non-empty.
 * - Excludes discontinued candidates when `excludeDiscontinued`.
 */
function filterCandidates(
  source: { id: string; brandId: string },
  pool: ColorWheelPaint[],
  options: Required<Pick<MatchOptions, 'excludeSamePaint' | 'excludeSameBrand' | 'excludeDiscontinued'>> & Pick<MatchOptions, 'brandIds'>,
): ColorWheelPaint[] {
  const brandIdSet =
    options.brandIds && options.brandIds.length > 0 ? new Set(options.brandIds) : null

  return pool.filter((candidate) => {
    const candidateBrandId = String(candidate.brand_id)
    if (options.excludeSamePaint && candidate.id === source.id) return false
    if (options.excludeSameBrand && candidateBrandId === source.brandId) return false
    if (brandIdSet && !brandIdSet.has(candidateBrandId)) return false
    if (options.excludeDiscontinued && candidate.is_discontinued) return false
    return true
  })
}

/**
 * Creates a cross-brand paint match service bound to the given Supabase client.
 *
 * Use {@link getMatchService} (in `match-service.server.ts`) for the server
 * Supabase wrapper. The service is paint-domain — its inputs and outputs
 * are paint records, not raw colors — and it composes the existing
 * {@link createPaintService} for catalog access.
 *
 * @param supabase - A Supabase client instance (typically server-side).
 * @returns An object exposing {@link findMatchesForPaint} and
 * {@link findMatchesForPaints}.
 */
export function createMatchService(supabase: SupabaseClient) {
  const paintService = createPaintService(supabase)

  return {
    /**
     * Finds the N closest cross-brand matches for a single source paint.
     *
     * Resolves the source paint by ID, fetches the appropriate candidate pool
     * (discontinued included or not), applies in-memory filters, then ranks
     * the survivors by CIE76 ΔE ascending via {@link rankPaintsByDeltaE}.
     *
     * Returns `[]` if the source paint cannot be found.
     *
     * @param paintId - UUID of the source paint.
     * @param options - {@link MatchOptions} for filtering and limiting.
     * @returns Array of {@link PaintMatch} sorted closest-first.
     */
    async findMatchesForPaint(paintId: string, options?: MatchOptions): Promise<PaintMatch[]> {
      const source = await paintService.getPaintById(paintId)
      if (!source) return []

      const excludeDiscontinued = options?.excludeDiscontinued ?? true
      const excludeSamePaint = options?.excludeSamePaint ?? true
      const excludeSameBrand = options?.excludeSameBrand ?? true
      const limit = resolveLimit(options?.limit)

      const pool = await paintService.getColorWheelPaints({
        includeDiscontinued: !excludeDiscontinued,
      })

      const sourceBrandId =
        source.product_lines?.brands?.id !== undefined && source.product_lines.brands.id !== null
          ? String(source.product_lines.brands.id)
          : ''
      const filtered = filterCandidates(
        { id: source.id, brandId: sourceBrandId },
        pool,
        {
          excludeSamePaint,
          excludeSameBrand,
          excludeDiscontinued,
          brandIds: options?.brandIds,
        },
      )

      return rankPaintsByDeltaE(source.hex, filtered, limit)
    },

    /**
     * Finds matches for a batch of source paints with a single shared
     * candidate-pool fetch.
     *
     * Used by callers (e.g. the `/discontinued` listing) that need to
     * pre-resolve substitutes for many paints during SSR without paying for
     * N separate round-trips to the catalog.
     *
     * Paints that cannot be resolved are omitted from the returned map.
     *
     * @param paintIds - UUIDs of the source paints.
     * @param options - {@link MatchOptions} for filtering and limiting.
     * @returns Map keyed by source paint ID containing each paint's matches.
     */
    async findMatchesForPaints(
      paintIds: string[],
      options?: MatchOptions,
    ): Promise<Record<string, PaintMatch[]>> {
      if (paintIds.length === 0) return {}

      const excludeDiscontinued = options?.excludeDiscontinued ?? true
      const excludeSamePaint = options?.excludeSamePaint ?? true
      const excludeSameBrand = options?.excludeSameBrand ?? true
      const limit = resolveLimit(options?.limit)

      const sources = await Promise.all(
        paintIds.map((id) => paintService.getPaintById(id)),
      )

      const pool = await paintService.getColorWheelPaints({
        includeDiscontinued: !excludeDiscontinued,
      })

      const result: Record<string, PaintMatch[]> = {}

      for (const source of sources) {
        if (!source) continue
        const sourceBrandId =
          source.product_lines?.brands?.id !== undefined && source.product_lines.brands.id !== null
            ? String(source.product_lines.brands.id)
            : ''
        const filtered = filterCandidates(
          { id: source.id, brandId: sourceBrandId },
          pool,
          {
            excludeSamePaint,
            excludeSameBrand,
            excludeDiscontinued,
            brandIds: options?.brandIds,
          },
        )
        result[source.id] = rankPaintsByDeltaE(source.hex, filtered, limit)
      }

      return result
    },
  }
}

/** The match service instance type. */
export type MatchService = ReturnType<typeof createMatchService>
