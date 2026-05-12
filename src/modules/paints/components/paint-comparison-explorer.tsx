'use client'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { PaintComparisonCard } from '@/modules/paints/components/paint-comparison-card'
import { PaintComparisonDeltaMatrix } from '@/modules/paints/components/paint-comparison-delta-matrix'
import { PaintComparisonPicker } from '@/modules/paints/components/paint-comparison-picker'
import { usePaintComparisonSelection } from '@/modules/paints/hooks/use-paint-comparison-selection'
import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'

/**
 * Client orchestrator for the `/compare` page.
 *
 * Delegates all selection state, URL sync, and hydration to
 * {@link usePaintComparisonSelection} and renders the picker, the row of
 * comparison cards, and the pairwise ΔE matrix. When no paints are
 * selected, renders an empty state with the picker.
 *
 * @param props.initialPaints - SSR-fetched paint records corresponding to
 *   the initial `?paints=` query parameter. Seeds the selection cache so
 *   the first render does not need to hit the server again.
 * @param props.catalog - Full paint list used by the searchable picker.
 */
export function PaintComparisonExplorer({
  initialPaints,
  catalog,
}: {
  initialPaints: PaintWithRelationsAndHue[]
  catalog: ColorWheelPaint[]
}) {
  const { selectedIds, paints, addPaint, removePaint, canAddMore, isHydrating } =
    usePaintComparisonSelection({ initialPaints })

  const isEmpty = paints.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-md">
        <PaintComparisonPicker
          selectedIds={selectedIds}
          catalog={catalog}
          onAdd={addPaint}
          canAddMore={canAddMore}
        />
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <h2 className="text-base font-semibold">Compare paints side by side</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search for a paint above to start a comparison. Add up to six paints and
            see their pairwise color difference in CIE76 ΔE.
          </p>
        </div>
      ) : (
        <div
          className="relative flex flex-col gap-4 overflow-x-auto sm:flex-row"
          aria-busy={isHydrating}
        >
          {paints.map((paint) => (
            <PaintComparisonCard
              key={paint.id}
              paint={paint}
              onRemove={removePaint}
            />
          ))}
          {isHydrating && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 text-sm text-muted-foreground">
              Loading…
            </div>
          )}
        </div>
      )}

      {paints.length >= 2 && <PaintComparisonDeltaMatrix paints={paints} />}
    </div>
  )
}
