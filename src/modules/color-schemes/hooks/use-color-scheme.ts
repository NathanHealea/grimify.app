'use client'

import { useMemo, useState } from 'react'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'
import { generateScheme } from '@/modules/color-schemes/utils/generate-scheme'
import { findNearestPaints } from '@/modules/color-schemes/utils/find-nearest-paints'

type UseColorSchemeOptions = {
  baseColor: BaseColor | null
  paints: ColorWheelPaint[]
  initialScheme?: ColorScheme
  initialAnalogousAngle?: number
}

type UseColorSchemeResult = {
  schemeColors: SchemeColor[]
  activeScheme: ColorScheme
  setActiveScheme: (scheme: ColorScheme) => void
  analogousAngle: number
  setAnalogousAngle: (angle: number) => void
}

/**
 * Orchestrates color scheme state for a given base color and paint list.
 *
 * Owns the active scheme type and analogous spread angle, and derives the full
 * set of {@link SchemeColor} entries (each with nearest matching paints) via
 * {@link generateScheme} and {@link findNearestPaints}.
 *
 * The hook is transport-agnostic: it accepts a {@link BaseColor} and a
 * {@link ColorWheelPaint} array, so it can be driven by any source (a paint
 * picker, a single paint's HSL, a custom hex input, etc.) without coupling to
 * a particular UI.
 *
 * @param options.baseColor - The selected base color, or `null` when no base color is chosen.
 * @param options.paints - The full paint list used for nearest-paint matching.
 * @param options.initialScheme - Optional initial harmony type. Defaults to `'complementary'`.
 * @param options.initialAnalogousAngle - Optional initial analogous spread angle in degrees. Defaults to `30`.
 * @returns Scheme state and setters: the derived `schemeColors`, the current `activeScheme` and `analogousAngle`, and their setters.
 */
export function useColorScheme({
  baseColor,
  paints,
  initialScheme = 'complementary',
  initialAnalogousAngle = 30,
}: UseColorSchemeOptions): UseColorSchemeResult {
  const [activeScheme, setActiveScheme] = useState<ColorScheme>(initialScheme)
  const [analogousAngle, setAnalogousAngle] = useState(initialAnalogousAngle)

  const schemeColors = useMemo<SchemeColor[]>(() => {
    if (!baseColor) return []
    return generateScheme(baseColor, activeScheme, analogousAngle).map((color) => ({
      ...color,
      nearestPaints: findNearestPaints(color.hue, paints),
    }))
  }, [baseColor, activeScheme, analogousAngle, paints])

  return {
    schemeColors,
    activeScheme,
    setActiveScheme,
    analogousAngle,
    setAnalogousAngle,
  }
}
