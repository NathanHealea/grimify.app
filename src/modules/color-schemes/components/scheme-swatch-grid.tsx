'use client'

import { SchemeSwatch } from '@/modules/color-schemes/components/scheme-swatch'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'

/**
 * Responsive row of {@link SchemeSwatch} items, one per computed scheme color.
 *
 * @param props.colors - Ordered array of scheme colors to display.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.ownedIds - Set of paint IDs in the user's collection.
 */
export function SchemeSwatchGrid({
  colors,
  isAuthenticated,
  ownedIds,
}: {
  colors: SchemeColor[]
  isAuthenticated: boolean
  ownedIds: Set<string>
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {colors.map((color) => (
        <SchemeSwatch
          key={color.label}
          color={color}
          isAuthenticated={isAuthenticated}
          ownedIds={ownedIds}
        />
      ))}
    </div>
  )
}
