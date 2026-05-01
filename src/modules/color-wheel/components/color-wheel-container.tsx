'use client'

import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import type { ColorWheelHue } from '@/modules/color-wheel/types/color-wheel-hue'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { useWheelFilters } from '@/modules/color-wheel/hooks/use-wheel-filters'
import { applyWheelFilters } from '@/modules/color-wheel/utils/apply-wheel-filters'
import { deriveFilterOptions } from '@/modules/color-wheel/utils/derive-filter-options'
import { WheelFiltersPanel } from './wheel-filters-panel'
import { HslColorWheel } from './hsl-color-wheel'
import { MunsellColorWheel } from './munsell-color-wheel'

type WheelView = 'munsell' | 'hsl'

/**
 * Client wrapper that hosts both the Munsell and HSL color wheel variants,
 * a view toggle, and the collapsible filter panel.
 *
 * Paint and hue data are fetched once on the server and passed as props here.
 * Filters are managed client-side via URL search params. Switching wheel views
 * preserves the active filter state.
 *
 * @param paints - All paints to plot on the wheel, fetched server-side.
 * @param hues - Munsell hue tree for the Munsell wheel, fetched server-side.
 * @param userPaintIds - Set of paint IDs in the user's collection; `undefined` when unauthenticated.
 */
export function ColorWheelContainer({
  paints,
  hues,
  userPaintIds,
}: {
  paints: ColorWheelPaint[]
  hues: ColorWheelHue[]
  userPaintIds?: Set<string>
}) {
  const [view, setView] = useState<WheelView>('munsell')

  const { state, setBrandIds, setProductLineIds, setPaintTypes, setOwnedOnly, clearAll, removeFilter } =
    useWheelFilters()

  const filterOptions = useMemo(() => deriveFilterOptions(paints), [paints])

  const filteredPaints = useMemo(
    () => applyWheelFilters(paints, state, userPaintIds),
    [paints, state, userPaintIds],
  )

  return (
    <div className="relative flex h-full w-full flex-col items-center gap-4 p-4">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setView('munsell')}
          className={cn('btn btn-sm', view === 'munsell' ? 'btn-primary' : 'btn-ghost')}
        >
          Munsell
        </button>
        <button
          type="button"
          onClick={() => setView('hsl')}
          className={cn('btn btn-sm', view === 'hsl' ? 'btn-primary' : 'btn-ghost')}
        >
          HSL
        </button>
      </div>

      <WheelFiltersPanel
        options={filterOptions}
        state={state}
        showOwnedFilter={userPaintIds !== undefined}
        onBrandChange={setBrandIds}
        onProductLineChange={setProductLineIds}
        onPaintTypeChange={setPaintTypes}
        onOwnedOnlyChange={setOwnedOnly}
        onClearAll={clearAll}
        onRemoveFilter={removeFilter}
      />

      {view === 'munsell' ? (
        <MunsellColorWheel paints={filteredPaints} hues={hues} />
      ) : (
        <HslColorWheel paints={filteredPaints} />
      )}
    </div>
  )
}
