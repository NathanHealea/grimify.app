import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import type { ColorGroup } from '@/modules/paints/types/color-group';

/**
 * A clickable card displaying a color group with a swatch, name, and paint count.
 *
 * Used on the `/paints` index page to show browsable color categories.
 * Each card links to the filtered paint list for that group.
 *
 * @param props.group - The color group data to display.
 */
export function ColorGroupCard({ group }: { group: ColorGroup }) {
  return (
    <Link href={`/paints?group=${group.slug}`}>
      <Card className="card-compact transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className="size-12 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: group.hex }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="font-semibold">{group.name}</h3>
            <p className="text-sm text-muted-foreground">
              {group.count} {group.count === 1 ? 'Paint' : 'Paints'}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
