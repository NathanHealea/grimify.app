'use client'

import { useMemo } from 'react'

import { SchemeOverview } from '@/modules/color-schemes/components/scheme-overview'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Source paint shape consumed by {@link PaintColorSchemesSection}.
 *
 * Intentionally narrower than `PaintWithRelationsAndHue` — the section only
 * needs the fields required to construct a {@link BaseColor} plus the paint's
 * `id` (used when constructing the section header copy).
 */
type PaintColorSchemesSectionPaint = {
  id: string
  name: string
  hue: number
  saturation: number
  lightness: number
  hex: string
}

/**
 * "Color schemes" section rendered on the paint detail page.
 *
 * Derives complementary, split-complementary, analogous, triadic, and tetradic
 * variations from the source paint's own HSL values and renders
 * {@link SchemeOverview} — a stacked, all-schemes-at-once view of catalog paint
 * matches per partner color. The paint itself is the implicit base color, so
 * no root/base color is rendered inside the section.
 *
 * @param props.paint - Source paint (HSL/hex/name/id) used as the base color.
 * @param props.paints - Full color-wheel paint list used for nearest-paint matching.
 * @param props.collectionPaintIds - IDs of paints in the current user's collection. Forwarded as a `Set` to {@link SchemeOverview} for owned-state styling.
 */
export function PaintColorSchemesSection({
  paint,
  paints,
  collectionPaintIds,
}: {
  paint: PaintColorSchemesSectionPaint
  paints: ColorWheelPaint[]
  collectionPaintIds: string[]
}) {
  const baseColor = useMemo<BaseColor>(
    () => ({
      hue: paint.hue,
      saturation: paint.saturation,
      lightness: paint.lightness,
      hex: paint.hex,
      name: paint.name,
    }),
    [paint.hue, paint.saturation, paint.lightness, paint.hex, paint.name],
  )

  const ownedIds = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Color schemes</h2>
        <p className="text-sm text-muted-foreground">
          Complementary, analogous, triadic, and tetradic harmonies of {paint.name}, matched to catalog paints.
        </p>
      </header>
      <SchemeOverview baseColor={baseColor} paints={paints} ownedIds={ownedIds} />
    </section>
  )
}
