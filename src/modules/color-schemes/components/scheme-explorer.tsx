'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import { BaseColorPicker } from '@/modules/color-schemes/components/base-color-picker'
import { SchemeTypeSelector } from '@/modules/color-schemes/components/scheme-type-selector'
import { SchemeSwatchGrid } from '@/modules/color-schemes/components/scheme-swatch-grid'
import { generateScheme } from '@/modules/color-schemes/utils/generate-scheme'
import { findNearestPaints } from '@/modules/color-schemes/utils/find-nearest-paints'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import { SaveSchemeAsPaletteButton } from '@/modules/color-schemes/components/save-scheme-as-palette-button'

/**
 * Main client component for the Color Scheme Explorer.
 *
 * Manages base color selection, active scheme type, and analogous spread angle.
 * Derives the full set of scheme colors (with nearest paints) via useMemo.
 * Renders a {@link SaveSchemeAsPaletteButton} once a base color is selected.
 *
 * @param props.paints - Full paint list fetched server-side and passed as a prop.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.collectionPaintIds - Array of paint IDs in the user's collection.
 */
export function SchemeExplorer({
  paints,
  isAuthenticated,
  collectionPaintIds,
}: {
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
  collectionPaintIds: string[]
}) {
  const [baseColor, setBaseColor] = useState<BaseColor | null>(null)
  const [activeScheme, setActiveScheme] = useState<ColorScheme>('complementary')
  const [analogousAngle, setAnalogousAngle] = useState(30)

  const ownedIds = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  const schemeColors = useMemo(() => {
    if (!baseColor) return []
    return generateScheme(baseColor, activeScheme, analogousAngle).map((color) => ({
      ...color,
      nearestPaints: findNearestPaints(color.hue, paints),
    }))
  }, [baseColor, activeScheme, analogousAngle, paints])

  return (
    <section className="flex flex-col gap-6">
      <BaseColorPicker paints={paints} onChange={setBaseColor} />

      {baseColor && (
        <>
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
          <SchemeSwatchGrid colors={schemeColors} isAuthenticated={isAuthenticated} ownedIds={ownedIds} />
        </>
      )}

      {!baseColor && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Select a base color to generate a scheme.</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
