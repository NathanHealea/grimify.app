'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubstitutePaintCard } from '@/modules/paints/components/substitute-paint-card'
import { usePaintSubstitutes } from '@/modules/paints/hooks/use-paint-substitutes'
import type { PaintMatch } from '@/modules/paints/types/paint-match'
import type { Brand } from '@/types/paint'

/** Sentinel value used by the "All brands" option (Radix doesn't allow empty string). */
const ALL_BRANDS_VALUE = '__all__'

/**
 * Substitutes section rendered on `PaintDetail` for discontinued paints.
 *
 * Thin renderer over {@link usePaintSubstitutes}: shows a brand-filter
 * dropdown (single-brand for v1) and a grid of {@link SubstitutePaintCard}s
 * ranked by ΔE ascending. When `initialMatches` is provided **and** the
 * filter starts unset, the hook skips the initial fetch.
 *
 * @param props.sourcePaintId - UUID of the discontinued source paint.
 * @param props.brands - All brands; populates the filter dropdown.
 * @param props.defaultLimit - Number of substitutes to fetch per request.
 * @param props.initialMatches - Optional seeded substitutes (typically
 *   SSR pre-resolved via `findMatchesForPaints`).
 */
export function PaintSubstitutes({
  sourcePaintId,
  brands,
  defaultLimit,
  initialMatches,
}: {
  sourcePaintId: string
  brands: Brand[]
  defaultLimit?: number
  initialMatches?: PaintMatch[]
}) {
  const { matches, selectedBrandIds, setSelectedBrandIds, isPending, error } =
    usePaintSubstitutes({ sourcePaintId, defaultLimit, initialMatches })

  const currentValue = selectedBrandIds[0] ?? ALL_BRANDS_VALUE

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Substitutes</h2>
          <p className="text-sm text-muted-foreground">
            Closest current paints across brands by CIE76 ΔE.
          </p>
        </div>
        <Select
          value={currentValue}
          onValueChange={(value) =>
            setSelectedBrandIds(value === ALL_BRANDS_VALUE ? [] : [value])
          }
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter substitutes by brand">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BRANDS_VALUE}>All brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}

      {isPending && matches.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
              <Skeleton className="size-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          No substitutes found{selectedBrandIds.length > 0 ? ' for the selected brand' : ''}.
        </p>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          aria-busy={isPending}
        >
          {matches.map((match) => (
            <SubstitutePaintCard key={match.paint.id} match={match} />
          ))}
        </div>
      )}
    </section>
  )
}
