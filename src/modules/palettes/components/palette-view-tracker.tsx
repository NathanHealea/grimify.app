'use client'

import { useEffect } from 'react'

import { addRecentlyViewedPaletteId } from '@/modules/palettes/utils/recently-viewed-palettes'

/**
 * Invisible client component that records a palette visit in `localStorage`.
 *
 * Renders nothing. On mount (and whenever `id` changes), calls
 * {@link addRecentlyViewedPaletteId} so the palette appears in the
 * "Recently viewed" section on the collection page.
 *
 * @param props.id - UUID of the palette being viewed.
 */
export function PaletteViewTracker({ id }: { id: string }) {
  useEffect(() => {
    addRecentlyViewedPaletteId(id)
  }, [id])

  return null
}
