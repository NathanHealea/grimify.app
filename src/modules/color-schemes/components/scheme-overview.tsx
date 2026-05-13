'use client'

import { useMemo, useState } from 'react'

import { SchemeOverviewBlock } from '@/modules/color-schemes/components/scheme-overview-block'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import { getSchemePartners } from '@/modules/color-schemes/utils/get-scheme-partners'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Renders all five color schemes at once for a known base color, with value-scale
 * paint matches per partner color.
 *
 * Unlike `SchemeDisplay`, this component:
 *   - has no scheme-type selector (every scheme is shown),
 *   - hides the base/root color (the calling page is already about that color),
 *   - renders catalog paint chips only (no derived swatches),
 *   - omits the save-as-palette action.
 *
 * @param props.baseColor - The implicit root color (e.g. the paint the user is viewing).
 * @param props.paints - Catalog paints used by the value-scale matcher.
 * @param props.ownedIds - Set of paint IDs in the user's collection. Forwarded to chips for owned-state styling.
 */
export function SchemeOverview({
  baseColor,
  paints,
  ownedIds,
}: {
  baseColor: BaseColor
  paints: ColorWheelPaint[]
  ownedIds: Set<string>
}) {
  const [analogousAngle, setAnalogousAngle] = useState(30)

  const complementary = useMemo(
    () => getSchemePartners(baseColor, 'complementary', paints),
    [baseColor, paints],
  )
  const split = useMemo(
    () => getSchemePartners(baseColor, 'split-complementary', paints),
    [baseColor, paints],
  )
  const analogous = useMemo(
    () => getSchemePartners(baseColor, 'analogous', paints, analogousAngle),
    [baseColor, paints, analogousAngle],
  )
  const triadic = useMemo(
    () => getSchemePartners(baseColor, 'triadic', paints),
    [baseColor, paints],
  )
  const tetradic = useMemo(
    () => getSchemePartners(baseColor, 'tetradic', paints),
    [baseColor, paints],
  )

  return (
    <div className="flex flex-col gap-4">
      <SchemeOverviewBlock title="Complementary" partners={complementary} ownedIds={ownedIds} />
      <SchemeOverviewBlock title="Split-Complementary" partners={split} ownedIds={ownedIds} />
      <SchemeOverviewBlock
        title="Analogous"
        partners={analogous}
        ownedIds={ownedIds}
        control={
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Spread {analogousAngle}°
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={analogousAngle}
              onChange={(e) => setAnalogousAngle(Number(e.target.value))}
              className="w-32"
              aria-label="Analogous spread angle"
            />
          </label>
        }
      />
      <SchemeOverviewBlock title="Triadic" partners={triadic} ownedIds={ownedIds} />
      <SchemeOverviewBlock title="Tetradic" partners={tetradic} ownedIds={ownedIds} />
    </div>
  )
}
