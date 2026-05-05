import Link from 'next/link'

import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { PaletteSwatchStrip } from '@/modules/palettes/components/palette-swatch-strip'
import { formatPaletteUpdatedLabel } from '@/modules/palettes/utils/format-palette-updated-label'

/**
 * Dashboard tile for a single palette.
 *
 * Uses a stretched-link pattern: an invisible `absolute inset-0` anchor makes
 * the whole card tappable, while the "Edit" link sits above it via `z-index`.
 * This avoids nested `<a>` elements and event-handler props, keeping the
 * component a pure server component.
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
      {/* Stretched link makes the whole card tappable without nesting <a> tags */}
      <Link
        href={`/palettes/${summary.id}`}
        className="absolute inset-0 z-0"
        aria-label={summary.name}
      />
      {canEdit && (
        <Link
          href={`/palettes/${summary.id}/edit`}
          className="btn btn-ghost btn-xs absolute right-2 top-2 z-10"
        >
          Edit
        </Link>
      )}
    </div>
  )
}
