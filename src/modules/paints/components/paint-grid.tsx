import type { ReactNode } from 'react'

import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Dumb grid of paint cards.
 *
 * Renders whatever `renderCard` returns for each paint — callers decide which
 * card variant to use (e.g. {@link PaintCard}, {@link CollectionPaintCard}, or
 * an admin card with an action overlay). The grid is responsible only for the
 * grid layout and empty-state copy.
 *
 * @param props.paints - Paints to display.
 * @param props.renderCard - Called once per paint; returns the card ReactNode.
 */
export function PaintGrid({
  paints,
  renderCard,
}: {
  paints: PaintWithBrand[]
  renderCard: (paint: PaintWithBrand) => ReactNode
}) {
  if (paints.length === 0) {
    return <p className="text-sm text-muted-foreground">No paints found.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {paints.map((paint) => (
        <div key={paint.id} className='flex'>{renderCard(paint)}</div>
      ))}
    </div>
  )
}
