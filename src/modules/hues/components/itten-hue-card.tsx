import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { IttenHue } from '@/types/color';

/**
 * A compact pill displaying an Itten hue group with a color dot and name.
 *
 * Supports two interaction modes:
 * - **Filter mode** (`onSelect` provided): clicking the pill toggles a filter callback.
 * - **Link mode** (no `onSelect`): the pill links to `/hues/[id]`.
 *
 * @param props.hue - The Itten hue data to display.
 * @param props.paintCount - Number of paints assigned to this hue group.
 * @param props.isSelected - Whether this hue is actively selected (visual highlight).
 * @param props.onSelect - Filter callback. When provided, pill click triggers filter instead of navigation.
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
  const sharedClasses = cn(
    'inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-colors',
    isSelected
      ? 'border-primary bg-primary/10 text-foreground'
      : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
  )

  const content = (
    <>
      <span
        className="size-4 shrink-0 rounded-full border border-border/50"
        style={{ backgroundColor: hue.hex_code }}
        aria-hidden="true"
      />
      <span className="font-medium">{hue.name}</span>
      <span className="text-xs opacity-60">{paintCount}</span>
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        className={cn(sharedClasses, 'cursor-pointer')}
        onClick={onSelect}
      >
        {content}
      </button>
    )
  }

  return (
    <Link href={`/hues/${hue.id}`} className={sharedClasses}>
      {content}
    </Link>
  )
}
