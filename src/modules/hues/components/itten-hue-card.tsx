import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { IttenHue } from '@/types/color'

/**
 * A card displaying an Itten hue group with a color swatch, name, and paint count.
 *
 * Supports two interaction modes:
 * - **Filter mode** (`onSelect` provided): clicking the card body triggers a filter
 *   callback; a separate "Details" link navigates to `/hues/[id]`.
 * - **Link mode** (no `onSelect`): the entire card links to `/hues/[id]`.
 *
 * @param props.hue - The Itten hue data to display.
 * @param props.paintCount - Number of paints assigned to this hue group.
 * @param props.isSelected - Whether this hue is actively selected (visual highlight).
 * @param props.onSelect - Filter callback. When provided, card click triggers filter instead of navigation.
 */
export function IttenHueCard({
  hue,
  paintCount,
  isSelected,
  onSelect,
}: {
  hue: IttenHue
  paintCount: number
  isSelected?: boolean
  onSelect?: () => void
}) {
  const cardContent = (
    <CardContent className="flex items-center gap-4 p-4">
      <div
        className="size-12 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: hue.hex_code }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{hue.name}</h3>
        <p className="text-sm text-muted-foreground">
          {paintCount} {paintCount === 1 ? 'paint' : 'paints'}
        </p>
      </div>
      {onSelect && (
        <Link
          href={`/hues/${hue.id}`}
          className="btn btn-ghost btn-xs shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          Details
        </Link>
      )}
    </CardContent>
  )

  if (onSelect) {
    return (
      <Card
        className={cn(
          'card-compact cursor-pointer transition-shadow hover:shadow-md',
          isSelected && 'ring-2 ring-primary'
        )}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        {cardContent}
      </Card>
    )
  }

  return (
    <Link href={`/hues/${hue.id}`}>
      <Card className="card-compact transition-shadow hover:shadow-md">
        {cardContent}
      </Card>
    </Link>
  )
}
