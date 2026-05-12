import { PaintCard } from '@/modules/paints/components/paint-card'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

/**
 * A {@link PaintCard} wrapped with a ΔE caption.
 *
 * Used to display a substitute paint with a visual indicator of how
 * perceptually close it is to its source. Keeps `PaintCard` focused on
 * generic paint rendering by adding the ΔE metadata at the wrapper level.
 *
 * @param props.match - The {@link PaintMatch} (`{ paint, deltaE }`) to render.
 */
export function SubstitutePaintCard({ match }: { match: PaintMatch }) {
  const paint = match.paint

  return (
    <div className="flex flex-col gap-1">
      <PaintCard
        id={paint.id}
        name={paint.name}
        hex={paint.hex}
        brand={paint.brand_name}
        paintType={paint.paint_type}
        isDiscontinued={paint.is_discontinued}
      />
      <p className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        ΔE {match.deltaE.toFixed(1)}
      </p>
    </div>
  )
}
