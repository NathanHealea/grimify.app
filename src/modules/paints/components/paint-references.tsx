import { PaintCard } from '@/modules/paints/components/paint-card'
import type { PaintReferenceWithRelated } from '@/modules/paints/services/paint-service'
import type { PaintReference } from '@/types/paint'

/** Labels for each relationship type. */
const relationshipLabels: Record<PaintReference['relationship'], string> = {
  similar: 'Similar Paints',
  alternative: 'Alternatives',
  complement: 'Complements',
}

/**
 * Displays related paints grouped by relationship type.
 *
 * Fetched paint references are organized into sections (similar,
 * alternative, complement) and rendered as a grid of paint cards.
 *
 * @param props.references - Array of paint references with joined related paint data.
 */
export function PaintReferences({ references }: { references: PaintReferenceWithRelated[] }) {
  if (references.length === 0) {
    return null
  }

  const grouped = new Map<PaintReference['relationship'], PaintReferenceWithRelated[]>()
  for (const ref of references) {
    const existing = grouped.get(ref.relationship) ?? []
    existing.push(ref)
    grouped.set(ref.relationship, existing)
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(grouped.entries()).map(([relationship, refs]) => (
        <section key={relationship}>
          <h2 className="mb-4 text-xl font-semibold">{relationshipLabels[relationship]}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {refs.map((ref) => (
              <PaintCard key={ref.id} id={ref.related_paint.id} name={ref.related_paint.name} hex={ref.related_paint.hex} brand={ref.related_paint.product_lines.brands.name} paintType={ref.related_paint.paint_type} isDiscontinued={ref.related_paint.is_discontinued} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
