import Link from 'next/link'

import type { IttenHue } from '@/types/color'

/**
 * A clickable card displaying a named color swatch, name, and paint count.
 *
 * Accepts a child-level {@link IttenHue} entry (one with `parent_id` set).
 * Links to the color detail page showing all paints assigned to this color.
 *
 * @param props.color - The child hue (named color) data to display.
 * @param props.paintCount - Number of paints assigned to this color.
 */
export function ColorCard({ color, paintCount }: { color: IttenHue; paintCount: number }) {
  return (
    <Link
      href={`/colors/${color.id}`}
      className="group flex flex-col items-center gap-2 rounded-lg border border-border p-3 transition-shadow hover:shadow-md"
    >
      <div
        className="size-16 rounded-lg border border-border"
        style={{ backgroundColor: color.hex_code }}
        aria-hidden="true"
      />
      <span className="text-center text-sm font-medium leading-tight">{color.name}</span>
      <span className="text-xs text-muted-foreground">
        {paintCount} {paintCount === 1 ? 'paint' : 'paints'}
      </span>
    </Link>
  )
}
