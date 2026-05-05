'use client'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { removePalettePaint } from '@/modules/palettes/actions/remove-palette-paint'

/**
 * A single row in a palette's paint list.
 *
 * Displays a 32 px color swatch, the paint name, brand/product-line label,
 * and an optional per-slot note. When `canEdit` is true, renders a server-action
 * form with a remove button so the slot can be deleted without JavaScript.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.position - 0-based slot index; passed to {@link removePalettePaint}.
 * @param props.paint - Full paint data for display.
 * @param props.note - Optional per-slot painter note.
 * @param props.canEdit - When true, renders the remove button form.
 */
export function PalettePaintRow({
  paletteId,
  position,
  paint,
  note,
  canEdit,
}: {
  paletteId: string
  position: number
  paint: ColorWheelPaint
  note: string | null
  canEdit: boolean
}) {
  const brandLine = [paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <div
        className="mt-0.5 size-8 shrink-0 rounded-sm"
        style={{ backgroundColor: paint.hex }}
        title={paint.hex}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{paint.name}</p>
        {brandLine && (
          <p className="text-xs text-muted-foreground">{brandLine}</p>
        )}
        {note && (
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        )}
      </div>
      {canEdit && (
        // bind pre-fills paletteId+position; cast required because TS form action
        // type demands void return but the action returns { error? } for programmatic use.
        <form
          action={
            removePalettePaint.bind(null, paletteId, position) as unknown as (
              formData: FormData
            ) => Promise<void>
          }
        >
          <button
            type="submit"
            className="btn btn-sm btn-ghost text-destructive hover:text-destructive"
            aria-label={`Remove ${paint.name}`}
          >
            Remove
          </button>
        </form>
      )}
    </div>
  )
}
