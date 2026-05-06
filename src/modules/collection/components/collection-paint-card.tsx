'use client'

import { PaintCard } from '@/modules/paints/components/paint-card'
import { CollectionToggle } from '@/modules/collection/components/collection-toggle'
import { AddToPaletteButton } from '@/modules/palettes/components/add-to-palette-button'

/**
 * A paint card with a collection toggle and add-to-palette button overlaid at the top-right.
 *
 * Wraps {@link PaintCard} in a `relative` container and absolutely positions
 * a {@link CollectionToggle} and {@link AddToPaletteButton} so the full card
 * remains clickable as a link while each button intercepts its own clicks
 * (via `stopPropagation` + `preventDefault`).
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
export function CollectionPaintCard({
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
    <div className="relative flex w-full">
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
      <AddToPaletteButton
        paintId={id}
        paintName={name}
        variant="icon"
        isAuthenticated={isAuthenticated}
        className="absolute right-1 top-9"
      />
    </div>
  )
}
