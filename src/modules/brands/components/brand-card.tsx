import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import type { BrandWithPaintCount } from '@/modules/brands/services/brand-service';

/**
 * A clickable card displaying a brand with its name and paint count.
 *
 * Used on the `/brands` index page. Each card links to the brand detail page.
 */
export function BrandCard({ brand }: { brand: BrandWithPaintCount }) {
  return (
    <Link href={`/brands/${brand.id}`}>
      <Card className="card-compact transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="size-12 shrink-0 rounded-full border border-border object-contain"
            />
          ) : (
            <div
              className="size-12 shrink-0 rounded-full border border-border bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground"
              aria-hidden="true"
            >
              {brand.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold">{brand.name}</h3>
            <p className="text-sm text-muted-foreground">
              {brand.paint_count} {brand.paint_count === 1 ? 'paint' : 'paints'}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
