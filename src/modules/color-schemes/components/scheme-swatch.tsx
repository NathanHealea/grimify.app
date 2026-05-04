'use client'

import { PaintCard } from '@/modules/paints/components/paint-card'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'

/**
 * Displays a single computed scheme color — swatch block, label, hex/hue values, and nearest paint cards.
 *
 * @param props.color - The computed {@link SchemeColor} to display.
 */
export function SchemeSwatch({ color }: { color: SchemeColor }) {
  return (
    <div className="flex flex-1 flex-col gap-2 min-w-40">
      <div
        className="w-full rounded-lg border border-border aspect-square"
        style={{ backgroundColor: color.hex }}
        aria-label={`${color.label} color: ${color.hex}`}
      />
      <p className="text-sm font-semibold">{color.label}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {color.hex} &nbsp; {Math.round(color.hue)}°
      </p>
      {color.nearestPaints.length > 0 && (
        <div className="flex flex-col gap-2">
          {color.nearestPaints.map((paint) => (
            <PaintCard
              key={paint.id}
              id={paint.id}
              name={paint.name}
              hex={paint.hex}
              brand={paint.brand_name}
              paintType={paint.paint_type}
            />
          ))}
        </div>
      )}
    </div>
  )
}
