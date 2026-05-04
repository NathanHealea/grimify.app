'use client'

import { SchemeSwatch } from '@/modules/color-schemes/components/scheme-swatch'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'

/**
 * Responsive row of {@link SchemeSwatch} items, one per computed scheme color.
 *
 * @param props.colors - Ordered array of scheme colors to display.
 */
export function SchemeSwatchGrid({ colors }: { colors: SchemeColor[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {colors.map((color) => (
        <SchemeSwatch key={color.label} color={color} />
      ))}
    </div>
  )
}
