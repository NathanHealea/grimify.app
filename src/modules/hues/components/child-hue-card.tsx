import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { IttenHue } from '@/types/color'

/**
 * A card displaying a child hue swatch, name, and paint count.
 *
 * Supports two interaction modes:
 * - **Filter mode** (`onSelect` provided): clicking the card body triggers a filter
 *   callback; a separate "Details" link navigates to `/hues/[id]`.
 * - **Link mode** (no `onSelect`): the entire card links to `/hues/[id]`.
 *
 * @param props.hue - The child hue (named color) data to display.
 * @param props.paintCount - Number of paints assigned to this child hue.
 * @param props.isSelected - Whether this child hue is actively selected (visual highlight).
 * @param props.onSelect - Filter callback. When provided, card click triggers filter instead of navigation.
 */
export function ChildHueCard({
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
  const content = (
    <>
      <div
        className="size-16 rounded-lg border border-border"
        style={{ backgroundColor: hue.hex_code }}
        aria-hidden="true"
      />
      <p className="text-center text-sm font-medium leading-tight">{hue.name}</p>
      <p className="text-xs text-muted-foreground">
        {paintCount} {paintCount === 1 ? 'paint' : 'paints'}
      </p>
      {onSelect && (
        <Link
          href={`/hues/${hue.id}`}
          className="btn btn-ghost btn-xs"
          onClick={(e) => e.stopPropagation()}
        >
          Details
        </Link>
      )}
    </>
  )

  const sharedClasses = cn(
    'group flex flex-col items-center gap-2 rounded-lg border border-border p-3 transition-shadow hover:shadow-md',
    isSelected && 'ring-2 ring-primary'
  )

  if (onSelect) {
    return (
      <div
        className={cn(sharedClasses, 'cursor-pointer')}
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
        {content}
      </div>
    )
  }

  return (
    <Link href={`/hues/${hue.id}`} className={sharedClasses}>
      {content}
    </Link>
  )
}
