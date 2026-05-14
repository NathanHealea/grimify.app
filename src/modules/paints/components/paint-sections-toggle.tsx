'use client'

import { useState } from 'react'

import { PaintColorSchemesSection } from '@/modules/paints/components/paint-color-schemes-section'
import { PaintSimilarSection } from '@/modules/paints/components/paint-similar-section'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { Brand } from '@/types/paint'
import { cn } from '@/lib/utils'

/** The two available panels on the paint detail page. */
type PaintSection = 'similar' | 'schemes'

/**
 * Two-button toggle that switches between the Similar Paints and Color Schemes
 * sections on the paint detail page.
 *
 * Owns the active-panel state (defaults to `'similar'`). Only the active
 * section is mounted — the inactive component is not rendered.
 *
 * @param props.paint - Source paint fields needed by both child sections.
 * @param props.paints - Full color-wheel paint list forwarded to {@link PaintColorSchemesSection}.
 * @param props.collectionPaintIds - IDs of paints in the user's collection, forwarded to {@link PaintColorSchemesSection}.
 * @param props.sourceBrandId - The source paint's brand ID, forwarded to {@link PaintSimilarSection}.
 * @param props.sourcePaintType - The source paint's type, forwarded to {@link PaintSimilarSection}.
 * @param props.brands - All brands for the Similar filter dropdown.
 * @param props.paintTypes - All distinct paint types for the Similar filter dropdown.
 */
export function PaintSectionsToggle({
  paint,
  paints,
  collectionPaintIds,
  sourceBrandId,
  sourcePaintType,
  brands,
  paintTypes,
}: {
  paint: {
    id: string
    name: string
    hue: number
    saturation: number
    lightness: number
    hex: string
  }
  paints: ColorWheelPaint[]
  collectionPaintIds: string[]
  sourceBrandId: string
  sourcePaintType: string | null
  brands: Brand[]
  paintTypes: string[]
}) {
  const [active, setActive] = useState<PaintSection>('similar')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActive('similar')}
          className={cn('btn btn-sm', active === 'similar' ? 'btn-primary' : 'btn-ghost')}
        >
          Similar
        </button>
        <button
          type="button"
          onClick={() => setActive('schemes')}
          className={cn('btn btn-sm', active === 'schemes' ? 'btn-primary' : 'btn-ghost')}
        >
          Color Schemes
        </button>
      </div>

      {active === 'similar' && (
        <PaintSimilarSection
          sourcePaintId={paint.id}
          sourceBrandId={sourceBrandId}
          sourcePaintType={sourcePaintType}
          brands={brands}
          paintTypes={paintTypes}
        />
      )}

      {active === 'schemes' && (
        <PaintColorSchemesSection
          paint={paint}
          paints={paints}
          collectionPaintIds={collectionPaintIds}
        />
      )}
    </div>
  )
}
