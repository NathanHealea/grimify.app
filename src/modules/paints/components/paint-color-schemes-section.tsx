'use client'

import { useMemo, useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SchemeOverview } from '@/modules/color-schemes/components/scheme-overview'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { Brand } from '@/types/paint'

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
 * A brand filter popover lets the user narrow scheme results to one or more
 * brands. Filtering is purely client-side — the `paints` array is sliced before
 * being passed to {@link SchemeOverview}. The filter resets whenever the
 * component unmounts (i.e. when the user switches to the Similar tab).
 *
 * @param props.paint - Source paint (HSL/hex/name/id) used as the base color.
 * @param props.paints - Full color-wheel paint list used for nearest-paint matching.
 * @param props.collectionPaintIds - IDs of paints in the current user's collection. Forwarded as a `Set` to {@link SchemeOverview} for owned-state styling.
 * @param props.brands - All brands available in the catalog, used to populate the brand filter.
 */
export function PaintColorSchemesSection({
  paint,
  paints,
  collectionPaintIds,
  brands = [],
}: {
  paint: PaintColorSchemesSectionPaint
  paints: ColorWheelPaint[]
  collectionPaintIds: string[]
  brands?: Brand[]
}) {
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])

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

  const filteredPaints = useMemo(
    () =>
      selectedBrandIds.length > 0
        ? paints.filter((p) => selectedBrandIds.includes(String(p.brand_id)))
        : paints,
    [paints, selectedBrandIds],
  )

  function toggleBrand(id: string) {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Color schemes</h2>
            <p className="text-sm text-muted-foreground">
              Complementary, analogous, triadic, and tetradic harmonies of {paint.name}, matched to catalog paints.
            </p>
          </div>
          {brands.length > 0 && (
            <Popover>
              <PopoverTrigger className="btn btn-outline btn-sm shrink-0">
                Brand
                {selectedBrandIds.length > 0 && (
                  <span className="badge badge-sm badge-primary ml-2">
                    {selectedBrandIds.length}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="max-h-72 w-56 overflow-auto p-2" align="end">
                <ul className="flex flex-col gap-1">
                  {brands.map((brand) => {
                    const id = String(brand.id)
                    const checked = selectedBrandIds.includes(id)
                    return (
                      <li key={id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBrand(id)}
                          />
                          <span>{brand.name}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {selectedBrandIds.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs mt-2 w-full"
                    onClick={() => setSelectedBrandIds([])}
                  >
                    Clear
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </header>
      <SchemeOverview baseColor={baseColor} paints={filteredPaints} ownedIds={ownedIds} />
    </section>
  )
}
