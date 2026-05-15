'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { PaintCombobox } from '@/modules/paints/components/paint-combobox'
import { addPaintToPalette } from '@/modules/palettes/actions/add-paint-to-palette'
import { addToCollection } from '@/modules/collection/actions/add-to-collection'

/**
 * Paint search combobox for the palette editor.
 *
 * Renders a searchable paint picker above the palette's paint list. On
 * selection, adds the chosen paint to the palette via {@link addPaintToPalette}.
 * When the "Also save to my collection" checkbox is checked and the paint is
 * not already owned, also dispatches {@link addToCollection}.
 *
 * The two writes are sequential and independent — a collection failure does not
 * roll back the palette add.
 *
 * @param props.paletteId - UUID of the palette being edited.
 * @param props.paletteName - Display name used in toast messages.
 * @param props.catalog - Full paint catalog to search against.
 * @param props.excludedPaintIds - IDs already in the palette; filtered out of results.
 * @param props.collectionPaintIds - IDs of paints the viewer already owns; skips the collection write when the selection matches.
 */
export function PalettePaintPicker({
  paletteId,
  paletteName,
  catalog,
  excludedPaintIds,
  collectionPaintIds,
}: {
  paletteId: string
  paletteName: string
  catalog: ColorWheelPaint[]
  excludedPaintIds: string[]
  collectionPaintIds: string[]
}) {
  const [alsoSaveToCollection, setAlsoSaveToCollection] = useState(false)
  const [isPending, startTransition] = useTransition()

  const candidates = useMemo(() => {
    const excluded = new Set(excludedPaintIds)
    return catalog.filter((p) => !excluded.has(p.id))
  }, [catalog, excludedPaintIds])

  const ownedSet = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  function handleSelect(paint: ColorWheelPaint) {
    startTransition(async () => {
      const paletteResult = await addPaintToPalette(paletteId, paint.id)

      if ('error' in paletteResult) {
        if (paletteResult.code === 'duplicate') {
          toast.error(`'${paint.name}' is already in '${paletteName}'`)
        } else {
          toast.error(paletteResult.error)
        }
        return
      }

      toast.success(`Added '${paint.name}' to '${paletteResult.paletteName}'`)

      if (alsoSaveToCollection && !ownedSet.has(paint.id)) {
        const collectionResult = await addToCollection(
          paint.id,
          `/user/palettes/${paletteId}/edit`,
        )
        if (collectionResult.error) {
          toast.error(collectionResult.error)
        } else {
          toast.success(`Added '${paint.name}' to your collection`)
        }
      }
    })
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex-1">
        <PaintCombobox
          paints={candidates}
          onSelect={handleSelect}
          placeholder="Search paints to add to this palette…"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground sm:whitespace-nowrap">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={alsoSaveToCollection}
          onChange={(e) => setAlsoSaveToCollection(e.target.checked)}
          disabled={isPending}
        />
        Also save to my collection
      </label>
    </div>
  )
}
