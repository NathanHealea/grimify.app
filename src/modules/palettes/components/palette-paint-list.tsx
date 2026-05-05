import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import { PalettePaintRow } from '@/modules/palettes/components/palette-paint-row'

/**
 * Vertical list of paint rows for a palette.
 *
 * Maps each {@link PalettePaint} slot to a {@link PalettePaintRow}. When a
 * slot's embedded `paint` is missing (e.g. the paint was deleted upstream),
 * renders a muted placeholder row instead of crashing.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.paints - Ordered array of paint slots.
 * @param props.canEdit - When true, each row shows a remove button.
 */
export function PalettePaintList({
  paletteId,
  paints,
  canEdit,
}: {
  paletteId: string
  paints: PalettePaint[]
  canEdit: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      {paints.map((slot) =>
        slot.paint ? (
          <PalettePaintRow
            key={slot.position}
            paletteId={paletteId}
            position={slot.position}
            paint={slot.paint}
            note={slot.note}
            canEdit={canEdit}
          />
        ) : (
          <div
            key={slot.position}
            className="flex items-center rounded-lg border border-border p-3 text-sm text-muted-foreground"
          >
            Paint unavailable
          </div>
        )
      )}
    </div>
  )
}
