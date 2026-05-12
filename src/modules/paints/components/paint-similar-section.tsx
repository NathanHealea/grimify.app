'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { findPaintMatches } from '@/modules/paints/actions/find-paint-matches'
import { SimilarPaintCard } from '@/modules/paints/components/similar-paint-card'
import type { PaintMatch } from '@/modules/paints/types/paint-match'
import {
  EMPTY_SIMILAR_PAINTS_FILTER_STATE,
  UNTYPED_PAINT_TYPE,
  type SimilarPaintsFilterState,
} from '@/modules/paints/types/similar-paints-filter-state'
import type { Brand } from '@/types/paint'

/** Default number of matches the section requests from the engine. */
const DEFAULT_SIMILAR_LIMIT = 12

/**
 * Inline "Similar Paints" section rendered below the hue classification block
 * on every paint detail page.
 *
 * Owns its own filter state (brand multi-select, paint-type multi-select,
 * and a "Same brand only" toggle), calls {@link findPaintMatches} via
 * `useTransition`, and renders the resulting matches as a grid of
 * {@link SimilarPaintCard}s.
 *
 * Engine options are derived from `filterState`:
 * - `excludeDiscontinued: true` (always — substitutes are feature 02's job).
 * - `excludeSamePaint: true`.
 * - `excludeSameBrand`: `false` when `sameBrandOnly` is true; otherwise the
 *   engine's default (`true`).
 * - `brandIds`:
 *   - `sameBrandOnly` → `[sourceBrandId]`.
 *   - Otherwise the user's brand chips, or `undefined` for all brands.
 * - `limit: defaultLimit`.
 *
 * Paint-type filtering is applied client-side after the action returns — the
 * engine ranks by perceptual ΔE only.
 *
 * @param props.sourcePaintId - UUID of the paint we are finding neighbours for.
 * @param props.sourceBrandId - The source paint's brand ID (string form), used
 *   for the "Same brand only" toggle.
 * @param props.sourcePaintType - The source paint's type, currently unused
 *   in the engine call but documented so future logic can use it.
 * @param props.brands - All brands available for the filter dropdown.
 * @param props.paintTypes - All distinct paint types available for the filter
 *   dropdown.
 * @param props.defaultLimit - Number of matches to request. Defaults to
 *   {@link DEFAULT_SIMILAR_LIMIT}.
 */
export function PaintSimilarSection({
  sourcePaintId,
  sourceBrandId,
  // sourcePaintType is intentionally read but unused for now; documented.
  sourcePaintType: _sourcePaintType,
  brands,
  paintTypes,
  defaultLimit = DEFAULT_SIMILAR_LIMIT,
}: {
  sourcePaintId: string
  sourceBrandId: string
  sourcePaintType: string | null
  brands: Brand[]
  paintTypes: string[]
  defaultLimit?: number
}) {
  const [filterState, setFilterState] = useState<SimilarPaintsFilterState>(
    EMPTY_SIMILAR_PAINTS_FILTER_STATE,
  )
  const [matches, setMatches] = useState<PaintMatch[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [isPending, startTransition] = useTransition()

  // Re-fetch whenever the brand filter or "same brand only" toggle changes.
  // Paint-type filtering is purely client-side, so it does not invalidate
  // the engine call — handled via `filteredMatches` below.
  //
  // The fetch is deferred to a microtask so the `setError`/`setMatches`
  // calls inside `startTransition` don't fire synchronously during the
  // effect, which would trip the `react-hooks/set-state-in-effect` rule.
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      startTransition(async () => {
        setError(null)
        try {
          const brandIds = filterState.sameBrandOnly
            ? [sourceBrandId]
            : filterState.brandIds.length > 0
              ? filterState.brandIds
              : undefined
          const fetched = await findPaintMatches(sourcePaintId, {
            excludeDiscontinued: true,
            excludeSamePaint: true,
            excludeSameBrand: filterState.sameBrandOnly ? false : undefined,
            brandIds,
            limit: defaultLimit,
          })
          if (cancelled) return
          setMatches(fetched)
        } catch (err) {
          if (cancelled) return
          const wrapped =
            err instanceof Error ? err : new Error('Failed to load similar paints')
          setError(wrapped)
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [sourcePaintId, sourceBrandId, defaultLimit, filterState.brandIds, filterState.sameBrandOnly])

  const filteredMatches = useMemo(() => {
    if (filterState.paintTypes.length === 0) return matches
    const allow = new Set(filterState.paintTypes)
    return matches.filter((m) =>
      allow.has(m.paint.paint_type ?? UNTYPED_PAINT_TYPE),
    )
  }, [matches, filterState.paintTypes])

  const hasActiveFilters =
    filterState.brandIds.length > 0 ||
    filterState.paintTypes.length > 0 ||
    filterState.sameBrandOnly

  function toggleBrand(id: string) {
    setFilterState((prev) => ({
      ...prev,
      brandIds: prev.brandIds.includes(id)
        ? prev.brandIds.filter((b) => b !== id)
        : [...prev.brandIds, id],
    }))
  }

  function togglePaintType(type: string) {
    setFilterState((prev) => ({
      ...prev,
      paintTypes: prev.paintTypes.includes(type)
        ? prev.paintTypes.filter((t) => t !== type)
        : [...prev.paintTypes, type],
    }))
  }

  function toggleSameBrandOnly() {
    setFilterState((prev) => ({
      ...prev,
      // Clear brand chips when same-brand-only is engaged so the two paths
      // do not contradict each other.
      brandIds: !prev.sameBrandOnly ? [] : prev.brandIds,
      sameBrandOnly: !prev.sameBrandOnly,
    }))
  }

  function clearAll() {
    setFilterState(EMPTY_SIMILAR_PAINTS_FILTER_STATE)
  }

  const brandNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of brands) map.set(String(b.id), b.name)
    return map
  }, [brands])

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Similar paints</h2>
        <p className="text-sm text-muted-foreground">
          Ranked by perceptual distance from this paint.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger className="btn btn-outline btn-sm">
            Brand
            {filterState.brandIds.length > 0 && (
              <span className="badge badge-sm badge-primary ml-2">
                {filterState.brandIds.length}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-56 max-h-72 overflow-auto p-2">
            {brands.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No brands.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {brands.map((brand) => {
                  const id = String(brand.id)
                  const checked = filterState.brandIds.includes(id)
                  return (
                    <li key={id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent ${
                          filterState.sameBrandOnly ? 'cursor-not-allowed opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={filterState.sameBrandOnly}
                          onChange={() => toggleBrand(id)}
                        />
                        <span>{brand.name}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger className="btn btn-outline btn-sm">
            Paint type
            {filterState.paintTypes.length > 0 && (
              <span className="badge badge-sm badge-primary ml-2">
                {filterState.paintTypes.length}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-56 max-h-72 overflow-auto p-2">
            {paintTypes.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No types.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {paintTypes.map((type) => {
                  const checked = filterState.paintTypes.includes(type)
                  return (
                    <li key={type}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePaintType(type)}
                        />
                        <span className="capitalize">{type}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
          title={
            filterState.brandIds.length > 0
              ? 'Clear brand filters to enable same-brand mode.'
              : 'Restrict matches to paints from this paint’s brand.'
          }
        >
          <input
            type="checkbox"
            checked={filterState.sameBrandOnly}
            disabled={filterState.brandIds.length > 0}
            onChange={toggleSameBrandOnly}
          />
          <span>Same brand only</span>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="btn btn-ghost btn-sm"
          >
            Clear all
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filterState.sameBrandOnly && (
            <FilterChip
              label="Same brand only"
              onRemove={toggleSameBrandOnly}
            />
          )}
          {filterState.brandIds.map((id) => (
            <FilterChip
              key={`brand-${id}`}
              label={`Brand: ${brandNameById.get(id) ?? id}`}
              onRemove={() => toggleBrand(id)}
            />
          ))}
          {filterState.paintTypes.map((type) => (
            <FilterChip
              key={`type-${type}`}
              label={`Type: ${type}`}
              onRemove={() => togglePaintType(type)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {isPending && matches.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: defaultLimit }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-3"
            >
              <Skeleton className="size-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No similar paints with the current filters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="btn btn-ghost btn-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          aria-busy={isPending}
        >
          {filteredMatches.map((match) => (
            <SimilarPaintCard key={match.paint.id} match={match} />
          ))}
        </div>
      )}
    </section>
  )
}

/** Removable filter chip — styled to match `WheelFiltersPanel`. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="badge badge-soft badge-sm inline-flex items-center gap-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-foreground"
        aria-label={`Remove ${label} filter`}
      >
        ✕
      </button>
    </span>
  )
}
