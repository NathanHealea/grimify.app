import Link from 'next/link'

import { cn } from '@/lib/utils'
import { DiscontinuedBadge } from '@/modules/paints/components/discontinued-badge'
import { paintSwatchBackground } from '@/modules/paints/utils/paint-swatch-background'

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
 * @param props.isMetallic - Whether the paint is metallic. Used to render a
 *   diagonal sheen gradient on the swatch. Defaults to `false`.
 * @param props.isDiscontinued - When `true`, overlays a `DiscontinuedBadge`
 *   on the swatch. Defaults to `false` so existing call-sites compile.
 * @param props.size - `'sm'` (default) compact grid card; `'lg'` for search/browse
 *   grids with fewer columns — larger swatch and heading-weight name.
 * @param props.className - Optional additional CSS classes for the outer card wrapper.
 */
export function PaintCard({
  id,
  name,
  hex,
  brand,
  paintType,
  isMetallic = false,
  isDiscontinued = false,
  size = 'sm',
  className,
}: {
  id: string
  name: string
  hex: string
  brand?: string
  paintType?: string | null
  isMetallic?: boolean
  isDiscontinued?: boolean
  size?: 'sm' | 'lg'
  className?: string
}) {
  const isLg = size === 'lg'

  return (
    <div className={cn('card card-compact w-full', isLg ? 'h-52' : 'h-40', className)}>
      <Link href={`/paints/${id}`} className="card-body flex h-full flex-col items-center gap-2">
        <div className="relative">
          <div
            className={cn('rounded-full border border-border', isLg ? 'size-20' : 'size-16')}
            style={paintSwatchBackground(hex, paintType ?? null, isMetallic)}
            aria-hidden="true"
          />
          {isDiscontinued && (
            <div className="absolute -right-1 -top-1">
              <DiscontinuedBadge size="sm" />
            </div>
          )}
        </div>
        <p className={cn('text-center leading-tight', isLg ? 'text-base font-semibold' : 'text-sm font-medium')}>
          {name}
        </p>
        {(brand || paintType) && (
          <p className="text-center text-xs text-muted-foreground leading-tight">
            {brand}
            {brand && paintType ? ': ' : ''}
            {paintType?.replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        )}
      </Link>
    </div>
  )
}
