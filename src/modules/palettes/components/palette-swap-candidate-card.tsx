'use client'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A compact candidate tile in the hue-swap dialog grid.
 *
 * Displays a 40×40 swatch, paint name (truncated), brand: product line,
 * a ΔE badge in the top-right corner, and an optional "Owned" pill when the
 * paint is in the user's collection.
 *
 * @param props.paint - The candidate paint.
 * @param props.deltaE - CIE76 perceptual distance from the source paint.
 * @param props.isOwned - When true, renders an "Owned" pill.
 * @param props.onSelect - Called with the paint's id when the tile is clicked.
 */
export function PaletteSwapCandidateCard({
  paint,
  deltaE,
  isOwned,
  onSelect,
}: {
  paint: ColorWheelPaint
  deltaE: number
  isOwned: boolean
  onSelect: (paintId: string) => void
}) {
  const brandLine = [paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')

  return (
    <button
      type="button"
      onClick={() => onSelect(paint.id)}
      className="relative flex flex-col items-start gap-1.5 rounded-lg border border-border p-2 text-left hover:bg-muted transition-colors w-full"
    >
      {/* ΔE badge — top right */}
      <span className="absolute right-1.5 top-1.5 rounded bg-base-200 px-1 py-0.5 text-[10px] font-mono leading-none text-muted-foreground">
        ΔE {deltaE.toFixed(1)}
      </span>

      {/* Swatch */}
      <div
        className="size-10 shrink-0 rounded-sm"
        style={{ backgroundColor: paint.hex }}
        aria-hidden
      />

      {/* Paint info */}
      <div className="w-full min-w-0">
        <p className="truncate text-xs font-medium leading-snug">{paint.name}</p>
        {brandLine && (
          <p className="truncate text-[10px] text-muted-foreground leading-snug">{brandLine}</p>
        )}
      </div>

      {/* Owned pill */}
      {isOwned && (
        <span className="badge badge-xs badge-soft badge-primary">Owned</span>
      )}
    </button>
  )
}
