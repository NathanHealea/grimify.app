import Link from 'next/link'

import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { PaletteSwatchStrip } from '@/modules/palettes/components/palette-swatch-strip'
import { formatPaletteUpdatedLabel } from '@/modules/palettes/utils/format-palette-updated-label'

/**
 * Dashboard tile for a single palette.
 *
 * The entire card is a link to the read-only palette detail page. When
 * `canEdit` is true, an "Edit" link is rendered in the top-right corner using
 * `stopPropagation` so it navigates to the edit page without triggering the
 * card link.
 *
 * @param props.summary - Lightweight palette data from {@link PaletteSummary}.
 * @param props.canEdit - When true, shows an "Edit" link in the card corner.
 */
export function PaletteCard({
  summary,
  canEdit,
}: {
  summary: PaletteSummary
  canEdit?: boolean
}) {
  return (
    <div className="relative">
      <Link href={`/palettes/${summary.id}`} className="block">
        <div className="card card-body card-compact flex flex-col gap-3">
          <PaletteSwatchStrip hexes={summary.swatches} size="sm" />
          <div>
            <h3 className="card-title text-base">{summary.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {summary.paintCount} {summary.paintCount === 1 ? 'paint' : 'paints'}
              </span>
              {summary.isPublic ? (
                <span className="badge badge-soft badge-sm">Public</span>
              ) : (
                <span className="badge badge-soft badge-sm">Private</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatPaletteUpdatedLabel(summary.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </Link>
      {canEdit && (
        <Link
          href={`/palettes/${summary.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="btn btn-ghost btn-xs absolute right-2 top-2"
        >
          Edit
        </Link>
      )}
    </div>
  )
}
