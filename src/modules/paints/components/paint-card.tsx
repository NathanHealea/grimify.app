import Link from 'next/link';

import { cn } from '@/lib/utils';
import { DiscontinuedBadge } from '@/modules/paints/components/discontinued-badge'

/**
 * A compact paint card showing a color swatch, paint name, brand, and type.
 *
 * Reusable across pages wherever a paint needs to be displayed as a
 * clickable thumbnail (e.g., brand detail page, similar paints section).
 *
 * @param props.id - The paint's database ID, used for the detail page link.
 * @param props.name - The display name of the paint.
 * @param props.hex - The hex color value for the swatch background.
 * @param props.brand - The brand name (e.g., "Citadel").
 * @param props.paintType - The paint type (e.g., "base", "layer").
 * @param props.isDiscontinued - When `true`, overlays a `DiscontinuedBadge`
 *   on the swatch. Defaults to `false` so existing call-sites compile.
 * @param props.className - Optional additional CSS classes for the wrapper.
 */
export function PaintCard({
  id,
  name,
  hex,
  brand,
  paintType,
  isDiscontinued = false,
  className,
}: {
  id: string
  name: string
  hex: string
  brand?: string
  paintType?: string | null
  isDiscontinued?: boolean
  className?: string
}) {
  return (
    <Link
      href={`/paints/${id}`}
      className={cn(
        'group flex grow flex-col items-center gap-2 rounded-lg border border-border p-3 transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="relative">
        <div
          className="size-16 rounded-lg border border-border"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
        {isDiscontinued && (
          <div className="absolute -right-1 -top-1">
            <DiscontinuedBadge size="sm" />
          </div>
        )}
      </div>
      <p className="text-center text-sm font-medium leading-tight">{name}</p>
      {(brand || paintType) && (
        <p className="text-center text-xs text-muted-foreground leading-tight">
          {brand}{brand && paintType ? ': ' : ''}{paintType?.replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      )}
    </Link>
  )
}
