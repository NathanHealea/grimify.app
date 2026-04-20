import { PaintCardWithToggle } from '@/modules/collection/components/paint-card-with-toggle'
import { PaintCard } from '@/modules/paints/components/paint-card'
import type { Paint, ProductLine } from '@/types/paint'

/**
 * Displays paints grouped by product line for a brand detail page.
 *
 * Each product line is rendered as a section heading followed by a
 * responsive grid of paint cards. When `isAuthenticated` is true and
 * `userPaintIds` is provided, renders {@link PaintCardWithToggle} so
 * users can manage their collection inline.
 *
 * @param props.brandName - The brand's display name.
 * @param props.productLines - The brand's product lines, ordered by name.
 * @param props.paints - All paints belonging to the brand (across all product lines).
 * @param props.userPaintIds - Set of paint IDs in the current user's collection.
 * @param props.isAuthenticated - Whether the current user is signed in.
 */
export function BrandPaintList({
  brandName,
  productLines,
  paints,
  userPaintIds,
  isAuthenticated = false,
}: {
  brandName: string
  productLines: ProductLine[]
  paints: Paint[]
  userPaintIds?: Set<string>
  isAuthenticated?: boolean
}) {
  const paintsByProductLine = new Map<number, Paint[]>()
  for (const paint of paints) {
    const existing = paintsByProductLine.get(paint.product_line_id) ?? []
    existing.push(paint)
    paintsByProductLine.set(paint.product_line_id, existing)
  }

  return (
    <div className="flex flex-col gap-8">
      {productLines.map((line) => {
        const linePaints = paintsByProductLine.get(line.id) ?? []

        return (
          <section key={line.id}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{line.name}</h2>
              {line.description && <p className="text-sm text-muted-foreground">{line.description}</p>}
              <p className="text-sm text-muted-foreground">
                {linePaints.length} {linePaints.length === 1 ? 'paint' : 'paints'}
              </p>
            </div>
            {linePaints.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {linePaints.map((paint) =>
                  isAuthenticated ? (
                    <PaintCardWithToggle
                      key={paint.id}
                      id={paint.id}
                      name={paint.name}
                      hex={paint.hex}
                      brand={brandName}
                      paintType={paint.paint_type}
                      isInCollection={userPaintIds?.has(paint.id) ?? false}
                      isAuthenticated={isAuthenticated}
                    />
                  ) : (
                    <PaintCard key={paint.id} id={paint.id} name={paint.name} hex={paint.hex} brand={brandName} paintType={paint.paint_type} />
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No paints in this product line.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
