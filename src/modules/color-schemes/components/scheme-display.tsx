'use client'

import { SaveSchemeAsPaletteButton } from '@/modules/color-schemes/components/save-scheme-as-palette-button'
import { SchemeSwatchGrid } from '@/modules/color-schemes/components/scheme-swatch-grid'
import { SchemeTypeSelector } from '@/modules/color-schemes/components/scheme-type-selector'
import { useColorScheme } from '@/modules/color-schemes/hooks/use-color-scheme'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Reusable scheme exploration UI for a known base color.
 *
 * Renders the scheme type selector, the save-as-palette button, and the swatch
 * grid (with nearest-paint cards), driven by {@link useColorScheme}. The component
 * is opinionated: it always renders all three pieces. Callers that need a
 * different composition should consume {@link useColorScheme} directly and
 * compose the sub-components themselves.
 *
 * @param props.baseColor - The selected base color. The component assumes a non-null base color; callers must guard before mounting.
 * @param props.paints - The full paint list used for nearest-paint matching.
 * @param props.isAuthenticated - Whether the current user is signed in. Forwarded to nearest-paint cards.
 * @param props.ownedIds - Set of paint IDs in the user's collection. Forwarded to nearest-paint cards.
 * @param props.revalidatePath - Path passed to `CollectionPaintCard` for revalidation after collection toggles. Defaults to `'/schemes'`.
 */
export function SchemeDisplay({
  baseColor,
  paints,
  isAuthenticated,
  ownedIds,
  revalidatePath = '/schemes',
}: {
  baseColor: BaseColor
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
  ownedIds: Set<string>
  revalidatePath?: string
}) {
  const {
    schemeColors,
    activeScheme,
    setActiveScheme,
    analogousAngle,
    setAnalogousAngle,
  } = useColorScheme({ baseColor, paints })

  return (
    <div className="flex flex-col gap-6">
      <SchemeTypeSelector
        value={activeScheme}
        onChange={setActiveScheme}
        analogousAngle={analogousAngle}
        onAnalogousAngleChange={setAnalogousAngle}
      />
      <div className="flex justify-end">
        <SaveSchemeAsPaletteButton
          schemeColors={schemeColors}
          baseColor={baseColor}
          activeScheme={activeScheme}
        />
      </div>
      <SchemeSwatchGrid
        colors={schemeColors}
        isAuthenticated={isAuthenticated}
        ownedIds={ownedIds}
        revalidatePath={revalidatePath}
      />
    </div>
  )
}
