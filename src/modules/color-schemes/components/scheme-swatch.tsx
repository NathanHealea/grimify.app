'use client'

import { CollectionPaintCard } from '@/modules/collection/components/collection-paint-card'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'

/**
 * Displays a single computed scheme color — swatch block, label, hex/hue values, and nearest paint cards.
 *
 * Each nearest paint card includes a collection toggle for authenticated users.
 *
 * @param props.color - The computed {@link SchemeColor} to display.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.ownedIds - Set of paint IDs in the user's collection.
 * @param props.revalidatePath - Path passed to `CollectionPaintCard` for revalidation after collection toggles. Defaults to `'/schemes'`.
 */
export function SchemeSwatch({
  color,
  isAuthenticated,
  ownedIds,
  revalidatePath = '/schemes',
}: {
  color: SchemeColor
  isAuthenticated: boolean
  ownedIds: Set<string>
  revalidatePath?: string
}) {
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
            <CollectionPaintCard
              key={paint.id}
              id={paint.id}
              name={paint.name}
              hex={paint.hex}
              brand={paint.brand_name}
              paintType={paint.paint_type}
              isInCollection={ownedIds.has(paint.id)}
              isAuthenticated={isAuthenticated}
              revalidatePath={revalidatePath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
