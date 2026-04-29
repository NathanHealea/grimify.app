'use client'

import { useEffect } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Dismissible overlay panel displaying full details for a selected paint.
 *
 * Positioned absolutely inside the wheel's root container. Closes on:
 * - Clicking the close button
 * - Clicking the backdrop (outside the panel)
 * - Pressing the Escape key
 *
 * @param paint - The selected paint to display.
 * @param onClose - Callback to clear the selection and close the panel.
 */
export function PaintDetailPanel({
  paint,
  onClose,
}: {
  paint: ColorWheelPaint
  onClose: () => void
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      onPointerDown={onClose}
      aria-label="Close paint detail"
    >
      <div
        className="card relative flex flex-col gap-3 border border-border bg-background p-4 shadow-lg"
        style={{ minWidth: 220, maxWidth: 280 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm absolute right-2 top-2"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 rounded border border-border"
            style={{ backgroundColor: paint.hex }}
            aria-label={`Color swatch: ${paint.hex}`}
          />
          <p className="font-semibold leading-tight">{paint.name}</p>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Brand</dt>
          <dd>{paint.brand_name}</dd>

          <dt className="text-muted-foreground">Line</dt>
          <dd>{paint.product_line_name}</dd>

          <dt className="text-muted-foreground">Hex</dt>
          <dd className="font-mono">{paint.hex}</dd>

          <dt className="text-muted-foreground">Type</dt>
          <dd>{paint.is_metallic ? 'Metallic' : 'Standard'}</dd>
        </dl>
      </div>
    </div>
  )
}
