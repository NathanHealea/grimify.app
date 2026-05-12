'use client'

import { useMemo } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { PaintCombobox } from '@/modules/paints/components/paint-combobox'
import { MAX_COMPARE_PAINTS } from '@/modules/paints/utils/parse-compare-params'

/**
 * Searchable picker for adding paints to the comparison row.
 *
 * Wraps {@link PaintCombobox}, filters out paints already in
 * `selectedIds`, and disables the input once {@link MAX_COMPARE_PAINTS}
 * paints are selected. Calls `onAdd` with the chosen paint's ID.
 *
 * @param props.selectedIds - IDs currently in the comparison.
 * @param props.catalog - Full searchable paint list (typically
 *   `getColorWheelPaints()` output).
 * @param props.onAdd - Called with the chosen paint ID when the user picks
 *   a paint from the combobox dropdown.
 * @param props.canAddMore - When `false`, the picker is replaced by a
 *   disabled helper message.
 */
export function PaintComparisonPicker({
  selectedIds,
  catalog,
  onAdd,
  canAddMore,
}: {
  selectedIds: string[]
  catalog: ColorWheelPaint[]
  onAdd: (id: string) => void
  canAddMore: boolean
}) {
  const candidates = useMemo(() => {
    const selected = new Set(selectedIds)
    return catalog.filter((p) => !selected.has(p.id))
  }, [selectedIds, catalog])

  if (!canAddMore) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        You can compare up to {MAX_COMPARE_PAINTS} paints at once. Remove a paint to add another.
      </div>
    )
  }

  return (
    <PaintCombobox
      paints={candidates}
      onSelect={(paint) => onAdd(paint.id)}
      placeholder="Add a paint to compare…"
    />
  )
}
