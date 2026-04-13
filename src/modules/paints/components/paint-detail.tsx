import Link from 'next/link'

import type { PaintWithRelations } from '@/modules/paints/services/paint-service'

/**
 * Full detail view for a single paint.
 *
 * Displays a large color swatch, paint name, brand/product line info,
 * paint type, color values (hex, RGB, HSL), and status badges for
 * metallic or discontinued paints.
 *
 * @param props.paint - The paint record with joined product line and brand data.
 */
export function PaintDetail({ paint }: { paint: PaintWithRelations }) {
  const brand = paint.product_lines.brands
  const productLine = paint.product_lines

  return (
    <div className="flex flex-col gap-8">
      {/* Swatch and heading */}
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <div
          className="size-32 shrink-0 rounded-xl border border-border shadow-sm"
          style={{ backgroundColor: paint.hex }}
          aria-label={`Color swatch for ${paint.name}`}
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{paint.name}</h1>
          <p className="text-muted-foreground">
            <Link href={`/brands/${brand.id}`} className="underline hover:text-foreground">
              {brand.name}
            </Link>
            {' \u2014 '}
            {productLine.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {paint.paint_type && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {paint.paint_type}
              </span>
            )}
            {paint.is_metallic && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Metallic
              </span>
            )}
            {paint.is_discontinued && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                Discontinued
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Color values */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hex</h3>
          <p className="font-mono text-lg">{paint.hex}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">RGB</h3>
          <p className="font-mono text-lg">
            {paint.r}, {paint.g}, {paint.b}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">HSL</h3>
          <p className="font-mono text-lg">
            {paint.hue}&deg;, {paint.saturation}%, {paint.lightness}%
          </p>
        </div>
      </div>
    </div>
  )
}
