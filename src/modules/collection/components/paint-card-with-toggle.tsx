'use client'

import { PaintCard } from '@/modules/paints/components/paint-card'
import { CollectionToggle } from '@/modules/collection/components/collection-toggle'

/**
 * A paint card with a collection toggle overlaid at the top-right corner.
 *
 * Wraps {@link PaintCard} in a `relative` container and absolutely positions
 * a {@link CollectionToggle} so the full card remains clickable as a link while
 * the toggle intercepts its own clicks (via `stopPropagation` + `preventDefault`).
 *
 * @param props.id - The paint's database UUID.
 * @param props.name - The display name of the paint.
 * @param props.hex - The hex color value for the swatch background.
 * @param props.brand - The brand name (e.g., "Citadel").
 * @param props.paintType - The paint type (e.g., "base", "layer").
 * @param props.isInCollection - Whether the paint is in the user's collection.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.revalidatePath - Optional page path to revalidate after toggle.
 * @param props.className - Optional additional CSS classes for the card wrapper.
 */
export function PaintCardWithToggle({
  id,
  name,
  hex,
  brand,
  paintType,
  isInCollection,
  isAuthenticated,
  revalidatePath,
  className,
}: {
  id: string
  name: string
  hex: string
  brand?: string
  paintType?: string | null
  isInCollection: boolean
  isAuthenticated: boolean
  revalidatePath?: string
  className?: string
}) {
  return (
    <div className="relative flex">
      <PaintCard
        id={id}
        name={name}
        hex={hex}
        brand={brand}
        paintType={paintType}
        className={className}
      />
      <CollectionToggle
        paintId={id}
        isInCollection={isInCollection}
        isAuthenticated={isAuthenticated}
        size="sm"
        revalidatePath={revalidatePath}
        className="absolute right-1 top-1"
      />
    </div>
  )
}
