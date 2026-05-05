'use client'

import { useState } from 'react'
import { Replace } from 'lucide-react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { PaletteSwapDialog } from '@/modules/palettes/components/palette-swap-dialog'

/**
 * Icon-only button that opens the hue-swap dialog for a palette slot.
 *
 * Disabled with an explanatory tooltip when `paint.hue_id` is null — those
 * paints have no hue group and cannot be swapped by hue. The button owns the
 * {@link PaletteSwapDialog} state so the parent row stays stateless.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.position - 0-based slot index for this row.
 * @param props.paint - The current slot's paint.
 */
export function PaletteSwapButton({
  paletteId,
  position,
  paint,
}: {
  paletteId: string
  position: number
  paint: ColorWheelPaint
}) {
  const [open, setOpen] = useState(false)
  const disabled = paint.hue_id == null

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-xs btn-square"
        aria-label="Swap by hue"
        title={
          disabled
            ? "This paint has no hue assigned and can't be swapped by hue."
            : 'Swap by hue'
        }
      >
        <Replace className="size-3.5" />
      </button>

      {!disabled && (
        <PaletteSwapDialog
          paletteId={paletteId}
          position={position}
          paint={paint}
          open={open}
          onClose={() => setOpen(false)}
          onSwapped={() => setOpen(false)}
        />
      )}
    </>
  )
}
