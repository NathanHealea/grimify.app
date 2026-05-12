import { PaintCard } from '@/modules/paints/components/paint-card'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

/**
 * A {@link PaintCard} wrapped with a ΔE caption.
 *
 * Used inside the "Similar Paints" section on the paint detail page to
 * surface how perceptually close each match is to the source paint. Visually
 * identical to {@link SubstitutePaintCard} from feature 02 — kept as a
 * separate component so future divergence (e.g. metallic chips) is local.
 *
 * @param props.match - The {@link PaintMatch} (`{ paint, deltaE }`) to render.
 */
export function SimilarPaintCard({ match }: { match: PaintMatch }) {
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
