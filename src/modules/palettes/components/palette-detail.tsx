import Link from 'next/link'

import type { Palette } from '@/modules/palettes/types/palette'
import { PaletteSwatchStrip } from '@/modules/palettes/components/palette-swatch-strip'
import { PaletteGroupedPaintList } from '@/modules/palettes/components/palette-grouped-paint-list'
import { PaletteEmptyState } from '@/modules/palettes/components/palette-empty-state'
import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'

/**
 * Read-only body for a palette detail page.
 *
 * Renders the palette name, optional description, owner attribution, visibility
 * chip, a large swatch strip, and the ordered paint list. When the palette has
 * no paints, renders a guest empty-state instead of the list. An "Edit" link is
 * shown when the viewer owns the palette.
 *
 * @param props.palette - Fully hydrated palette data.
 * @param props.viewer - The currently authenticated user, or `null` for guests.
 * @param props.ownerDisplayName - Resolved display name of the palette owner.
 */
export function PaletteDetail({
  palette,
  viewer,
  ownerDisplayName,
}: {
  palette: Palette
  viewer: { id: string } | null
  ownerDisplayName: string | null
}) {
  const isOwner = viewer?.id === palette.userId
  const hexes = palette.paints
    .filter((slot) => slot.paint)
    .map((slot) => slot.paint!.hex)

  return (
    <div className="flex flex-col gap-6">
      <div className="card card-body">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{palette.name}</h1>
            <MarkdownRenderer
              content={palette.description}
              className="mt-1 text-muted-foreground"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {ownerDisplayName && (
                <span className="text-sm text-muted-foreground">
                  by {ownerDisplayName}
                </span>
              )}
              <span className="badge badge-soft badge-sm">
                {palette.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
          {isOwner && (
            <Link
              href={`/user/palettes/${palette.id}/edit`}
              className="btn btn-sm btn-ghost shrink-0"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {hexes.length > 0 && (
        <PaletteSwatchStrip hexes={hexes} size="lg" />
      )}

      {palette.paints.length > 0 ? (
        <PaletteGroupedPaintList
          paletteId={palette.id}
          paints={palette.paints}
          groups={palette.groups}
          canEdit={false}
        />
      ) : (
        <PaletteEmptyState variant="guest" />
      )}
    </div>
  )
}
