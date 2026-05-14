import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Renders one partner row: label + a fixed-width strip of five paint chips,
 * ordered light→dark, with the canonical (closest-hue) chip emphasised.
 *
 * @param props.label - Partner label (e.g. `Complement`, `Triad 1`, `Analogous −30°`).
 * @param props.hue - Partner hue in degrees, displayed alongside the label.
 * @param props.paints - Up to five paints to render. Center index (2) is the canonical match.
 * @param props.ownedIds - Set of paint IDs in the current user's collection — drives the small owned-state dot.
 */
export function SchemePartnerRow({
  label,
  hue,
  paints,
  ownedIds,
}: {
  label: string
  hue: number
  paints: ColorWheelPaint[]
  ownedIds: Set<string>
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{Math.round(hue)}°</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {paints.map((p, i) => (
          <Link
            key={p.id}
            href={`/paints/${p.id}`}
            className={cn(
              'flex flex-col gap-1 rounded-md border border-border p-2 transition hover:border-foreground/40',
              i === 2 && 'ring-2 ring-foreground/20',
            )}
            aria-label={`${p.name} (${p.brand_name}) — ${p.hex}`}
          >
            <span
              className="aspect-square w-full rounded"
              style={{ backgroundColor: p.hex }}
              aria-hidden
            />
            <span className="line-clamp-2 text-xs font-medium">{p.name}</span>
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{p.brand_name}</span>
            <span className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>{p.hex}</span>
              {ownedIds.has(p.id) && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-label="In your collection"
                />
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
