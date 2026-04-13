import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import type { IttenHue } from '@/types/color';

/**
 * A clickable card displaying an Itten hue group with a color swatch, name, and paint count.
 *
 * Links to `/paints/group/[id]` where all paints in the hue are listed.
 *
 * @param props.hue - The Itten hue data to display.
 * @param props.paintCount - Number of paints assigned to this hue group.
 */
export function IttenHueCard({ hue, paintCount }: { hue: IttenHue; paintCount: number }) {
  return (
    <Link href={`/paints/group/${hue.id}`}>
      <Card className="card-compact transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className="size-12 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: hue.hex_code }}
            aria-hidden="true"
          />
          <div className="min-w-0 text-center">
            <h3 className="font-semibold">{hue.name}</h3>
            <p className="text-sm text-muted-foreground">
              {paintCount} {paintCount === 1 ? 'paint' : 'paints'}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
