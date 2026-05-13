'use client'

import { SchemeSwatch } from '@/modules/color-schemes/components/scheme-swatch'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'

/**
 * Responsive row of {@link SchemeSwatch} items, one per computed scheme color.
 *
 * @param props.colors - Ordered array of scheme colors to display.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.ownedIds - Set of paint IDs in the user's collection.
 * @param props.revalidatePath - Optional path forwarded to each {@link SchemeSwatch} for revalidation after collection toggles.
 */
export function SchemeSwatchGrid({
  colors,
  isAuthenticated,
  ownedIds,
  revalidatePath,
}: {
  colors: SchemeColor[]
  isAuthenticated: boolean
  ownedIds: Set<string>
  revalidatePath?: string
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {colors.map((color) => (
        <SchemeSwatch
          key={color.label}
          color={color}
          isAuthenticated={isAuthenticated}
          ownedIds={ownedIds}
          revalidatePath={revalidatePath}
        />
      ))}
    </div>
  )
}
