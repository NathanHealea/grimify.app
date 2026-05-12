'use client'

import { X } from 'lucide-react'
import Link from 'next/link'

import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'

/**
 * Pure renderer for a single paint inside the comparison row.
 *
 * Displays a large color swatch, paint name (linked to its detail page),
 * brand and product line, paint type, hex, and metallic/discontinued
 * badges. A top-right remove button calls `onRemove(paint.id)`.
 *
 * @param props.paint - The paint record to display.
 * @param props.onRemove - Called with the paint's ID when the remove
 *   button is clicked.
 */
export function PaintComparisonCard({
  paint,
  onRemove,
}: {
  paint: PaintWithRelationsAndHue
  onRemove: (id: string) => void
}) {
  const brand = paint.product_lines.brands
  const productLine = paint.product_lines

  return (
    <div className="relative flex w-56 shrink-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:w-64">
      <button
        type="button"
        onClick={() => onRemove(paint.id)}
        aria-label={`Remove ${paint.name} from comparison`}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      <div
        className="h-32 w-full rounded-lg border border-border shadow-sm sm:h-40"
        style={{ backgroundColor: paint.hex }}
        aria-label={`Color swatch for ${paint.name}`}
      />

      <div className="flex flex-col gap-1">
        <Link
          href={`/paints/${paint.id}`}
          className="text-base font-semibold leading-tight hover:underline"
        >
          {paint.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          <Link
            href={`/brands/${brand.id}`}
            className="hover:text-foreground hover:underline"
          >
            {brand.name}
          </Link>
          {' — '}
          {productLine.name}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {paint.paint_type && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {paint.paint_type}
          </span>
        )}
        {paint.is_metallic && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            Metallic
          </span>
        )}
        {paint.is_discontinued && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Discontinued
          </span>
        )}
      </div>

      <p className="font-mono text-xs text-muted-foreground">{paint.hex}</p>
    </div>
  )
}
