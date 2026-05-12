'use client'

import { useMemo } from 'react'

import { SchemeDisplay } from '@/modules/color-schemes/components/scheme-display'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Source paint shape consumed by {@link PaintColorSchemesSection}.
 *
 * Intentionally narrower than `PaintWithRelationsAndHue` — the section only
 * needs the fields required to construct a {@link BaseColor} plus the paint's
 * `id` for revalidation routing.
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
 * Derives complementary, split-complementary, analogous, triadic, and
 * tetradic variations from the source paint's own HSL values and renders
 * the shared {@link SchemeDisplay} (selector, save-as-palette button, and
 * nearest-paint swatch grid).
 *
 * The paint itself is the implicit base color — no picker is rendered on
 * this page. Collection toggles inside the nearest-paint cards revalidate
 * the current paint detail route so badges stay fresh.
 *
 * @param props.paint - Source paint (HSL/hex/name/id) used as the base color.
 * @param props.paints - Full color-wheel paint list used for nearest-paint matching.
 * @param props.isAuthenticated - Whether the current user is signed in. Forwarded to nearest-paint cards.
 * @param props.collectionPaintIds - IDs of paints in the current user's collection. Forwarded as a `Set` to {@link SchemeDisplay}.
 */
export function PaintColorSchemesSection({
  paint,
  paints,
  isAuthenticated,
  collectionPaintIds,
}: {
  paint: PaintColorSchemesSectionPaint
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
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
          Variations and harmonies derived from {paint.name}, matched to paints in the catalog.
        </p>
      </header>
      <SchemeDisplay
        baseColor={baseColor}
        paints={paints}
        isAuthenticated={isAuthenticated}
        ownedIds={ownedIds}
        revalidatePath={`/paints/${paint.id}`}
      />
    </section>
  )
}
