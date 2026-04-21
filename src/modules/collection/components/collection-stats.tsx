import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CollectionStats } from '@/modules/collection/types/collection-stats'

/**
 * Displays aggregated stats for the user's paint collection.
 *
 * Renders three stat cards: total paints, top brands, and paint types.
 * When the collection is empty, renders a single full-width empty-state card
 * with a CTA linking to the paint library.
 *
 * @param props.stats - Aggregated collection statistics from {@link CollectionStats}.
 */
export function CollectionStats({ stats }: { stats: CollectionStats }) {
  if (stats.total === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">Your collection is empty.</p>
          <Link href="/paints" className="btn btn-primary btn-sm">
            Browse paints
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total paints */}
      <Card>
        <CardHeader>
          <CardTitle>Total paints</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{stats.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted-foreground">paints in your collection</p>
        </CardContent>
      </Card>

      {/* Top brands */}
      <Card>
        <CardHeader>
          <CardTitle>Top brands</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.byBrand.length === 0 ? (
            <p className="text-sm text-muted-foreground">No brand data</p>
          ) : (
            <ul className="space-y-1">
              {stats.byBrand.map(({ brand, count }) => (
                <li key={brand} className="flex items-center justify-between text-sm">
                  <span>{brand}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* By paint type */}
      <Card>
        <CardHeader>
          <CardTitle>By paint type</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.byType.length === 0 ? (
            <p className="text-sm text-muted-foreground">No type data</p>
          ) : (
            <ul className="space-y-1">
              {stats.byType.map(({ type, count }) => (
                <li key={type} className="flex items-center justify-between text-sm">
                  <span>{type}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
