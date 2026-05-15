'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PaintSortDirection, PaintSortField } from '@/modules/paints/utils/sort-paints'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { PaintSortBar } from '@/modules/paints/components/paint-sort-bar'
import { reorderPalettePaints } from '@/modules/palettes/actions/reorder-palette-paints'
import { sortPaletteSlots } from '@/modules/palettes/utils/sort-palette-slots'
import { PaletteForm } from '@/modules/palettes/components/palette-form'
import { PaletteGroupedPaintList } from '@/modules/palettes/components/palette-grouped-paint-list'
import { PaletteSortConfirmDialog } from '@/modules/palettes/components/palette-sort-confirm-dialog'
import { PaletteEmptyState } from '@/modules/palettes/components/palette-empty-state'
import { DeletePaletteButton } from '@/modules/palettes/components/delete-palette-button'
import { PalettePaintPicker } from '@/modules/palettes/components/palette-paint-picker'

/**
 * Full palette editor — composes the edit form, paint picker, sort controls,
 * grouped paint list, and delete action.
 *
 * Owns the sort state and dispatches {@link reorderPalettePaints} via
 * {@link sortPaletteSlots} on confirm. {@link PaletteGroupedPaintList}
 * re-seeds its local optimistic state from the updated `palette.paints` prop
 * after the server revalidates. Sort applies within each group independently
 * when groups are present.
 *
 * @param props.palette - Fully hydrated palette to edit.
 * @param props.catalog - Full paint catalog for the picker's search.
 * @param props.collectionPaintIds - IDs of paints the viewer already owns; used to pre-filter the "save to collection" toggle.
 */
export function PaletteBuilder({
  palette,
  catalog,
  collectionPaintIds,
}: {
  palette: Palette
  catalog: ColorWheelPaint[]
  collectionPaintIds: string[]
}) {
  const [sortField, setSortField] = useState<PaintSortField>('name')
  const [sortDirection, setSortDirection] = useState<PaintSortDirection>('asc')
  const [pendingSort, setPendingSort] = useState<{
    field: PaintSortField
    direction: PaintSortDirection
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirmSort() {
    if (!pendingSort) return
    const sorted = sortPaletteSlots(palette.paints, pendingSort.field, pendingSort.direction)
    setPendingSort(null)
    startTransition(async () => {
      const result = await reorderPalettePaints(
        palette.id,
        sorted.map((s) => ({ paintId: s.paintId, note: s.note, groupId: s.groupId })),
      )
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="card card-body flex flex-col gap-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Details</h2>
        <PaletteForm palette={palette} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Paints</h2>

        <PalettePaintPicker
          paletteId={palette.id}
          paletteName={palette.name}
          catalog={catalog}
          excludedPaintIds={palette.paints.map((slot) => slot.paintId)}
          collectionPaintIds={collectionPaintIds}
        />

        {palette.paints.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <PaintSortBar
              field={sortField}
              direction={sortDirection}
              onChange={(f, d) => {
                setSortField(f)
                setSortDirection(d)
              }}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setPendingSort({ field: sortField, direction: sortDirection })}
              className="btn btn-sm btn-outline"
              disabled={isPending}
            >
              Apply sort
            </button>
          </div>
        )}

        {palette.paints.length === 0 && <PaletteEmptyState variant="owner" />}

        <PaletteGroupedPaintList
          paletteId={palette.id}
          paints={palette.paints}
          groups={palette.groups}
          canEdit
        />

        <PaletteSortConfirmDialog
          open={pendingSort !== null}
          onConfirm={handleConfirmSort}
          onCancel={() => setPendingSort(null)}
          isPending={isPending}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <DeletePaletteButton palette={palette} />
      </div>
    </div>
  )
}
