'use client'

import type { Palette } from '@/modules/palettes/types/palette'
import { PaletteForm } from '@/modules/palettes/components/palette-form'
import { PalettePaintList } from '@/modules/palettes/components/palette-paint-list'
import { PaletteEmptyState } from '@/modules/palettes/components/palette-empty-state'
import { DeletePaletteButton } from '@/modules/palettes/components/delete-palette-button'

/**
 * Full palette editor — composes the edit form, paint list, and delete action.
 *
 * Renders a single card containing the {@link PaletteForm} for name/description/
 * visibility, followed by the editable {@link PalettePaintList} (or an owner
 * empty-state when no paints exist), and a footer with {@link DeletePaletteButton}.
 *
 * @param props.palette - Fully hydrated palette to edit.
 */
export function PaletteBuilder({ palette }: { palette: Palette }) {
  return (
    <div className="card card-body flex flex-col gap-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Details</h2>
        <PaletteForm palette={palette} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Paints</h2>
        {palette.paints.length > 0 ? (
          <PalettePaintList
            paletteId={palette.id}
            paints={palette.paints}
            canEdit
          />
        ) : (
          <PaletteEmptyState variant="owner" />
        )}
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <DeletePaletteButton palette={palette} />
      </div>
    </div>
  )
}
