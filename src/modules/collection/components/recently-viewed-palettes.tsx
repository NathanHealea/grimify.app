'use client'

import { useEffect, useState } from 'react'

import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { getRecentPaletteSummaries } from '@/modules/palettes/actions/get-recent-palette-summaries'
import { getRecentlyViewedPaletteIds } from '@/modules/palettes/utils/recently-viewed-palettes'
import { PaletteCardGrid } from '@/modules/palettes/components/palette-card-grid'

/**
 * Displays the user's recently-viewed palette cards on the collection page.
 *
 * Reads up to 6 palette IDs from `localStorage` on mount, fetches their
 * summaries via the {@link getRecentPaletteSummaries} server action, and
 * renders them using {@link PaletteCardGrid}. Palettes that have since been
 * deleted or made private are silently omitted.
 *
 * Renders a stable skeleton on the server (and during hydration) to avoid
 * layout reflow when the client data loads.
 */
export function RecentlyViewedPalettes() {
  const [summaries, setSummaries] = useState<PaletteSummary[] | null>(null)

  useEffect(() => {
    const ids = getRecentlyViewedPaletteIds().slice(0, 6)
    if (ids.length === 0) {
      setSummaries([])
      return
    }
    getRecentPaletteSummaries(ids).then(setSummaries)
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recently viewed palettes</h2>
      {summaries === null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}
      {summaries !== null && summaries.length === 0 && (
        <p className="text-sm text-muted-foreground">No recently viewed palettes yet.</p>
      )}
      {summaries !== null && summaries.length > 0 && (
        <PaletteCardGrid summaries={summaries} />
      )}
    </div>
  )
}
