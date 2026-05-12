import Link from 'next/link'

import type { Hue } from '@/types/color'
import { CollectionToggle } from '@/modules/collection/components/collection-toggle'
import { AddToPaletteButton } from '@/modules/palettes/components/add-to-palette-button'
import { DiscontinuedBadge } from '@/modules/paints/components/discontinued-badge'
import { FindSimilarButton } from '@/modules/paints/components/find-similar-button'
import { PaintSimilarSection } from '@/modules/paints/components/paint-similar-section'
import { PaintSubstitutes } from '@/modules/paints/components/paint-substitutes'
import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'
import type { Brand } from '@/types/paint'

/**
 * Full detail view for a single paint.
 *
 * Displays a large color swatch, paint name, brand/product line info,
 * paint type, color values (hex, RGB, HSL), hue classification links,
 * and status badges for metallic or discontinued paints.
 *
 * Renders a {@link CollectionToggle} and {@link AddToPaletteButton} next to
 * the paint name when `isAuthenticated` is provided.
 *
 * @param props.paint - The paint record with joined product line, brand, and hue data.
 * @param props.parentHue - The parent Munsell principal hue, if the paint has a sub-hue.
 * @param props.isInCollection - Whether the paint is in the user's collection.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.brands - All brands, used by the substitutes brand filter when
 *   the paint is discontinued and by the {@link PaintSimilarSection} brand
 *   filter. Always required now that Similar Paints renders for every paint.
 * @param props.paintTypes - Distinct paint-type strings for the
 *   {@link PaintSimilarSection} paint-type filter dropdown.
 */
export function PaintDetail({
  paint,
  parentHue,
  isInCollection = false,
  isAuthenticated = false,
  brands = [],
  paintTypes = [],
}: {
  paint: PaintWithRelationsAndHue
  parentHue: Hue | null
  isInCollection?: boolean
  isAuthenticated?: boolean
  brands?: Brand[]
  paintTypes?: string[]
}) {
  const brand = paint.product_lines.brands
  const productLine = paint.product_lines
  const subHue = paint.hues

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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{paint.name}</h1>
            <CollectionToggle
              paintId={paint.id}
              paintName={paint.name}
              isInCollection={isInCollection}
              isAuthenticated={isAuthenticated}
              size="md"
              revalidatePath={`/paints/${paint.id}`}
            />
            <AddToPaletteButton
              paintId={paint.id}
              paintName={paint.name}
              variant="full"
              isAuthenticated={isAuthenticated}
            />
            <FindSimilarButton paintId={paint.id} />
          </div>
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
            {paint.is_discontinued && <DiscontinuedBadge />}
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

      {/* Hue classification */}
      {subHue && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hue</h2>
          <div className="flex flex-wrap items-center gap-2">
            {parentHue && (
              <Link
                href={`/hues/${parentHue.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <span
                  className="size-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: parentHue.hex_code }}
                  aria-hidden="true"
                />
                {parentHue.name}
              </Link>
            )}
            {parentHue && (
              <span className="text-muted-foreground" aria-hidden="true">/</span>
            )}
            <Link
              href={`/hues/${subHue.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <span
                className="size-3 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: subHue.hex_code }}
                aria-hidden="true"
              />
              {subHue.name}
            </Link>
          </div>
        </div>
      )}

      <PaintSimilarSection
        sourcePaintId={paint.id}
        sourceBrandId={String(brand.id)}
        sourcePaintType={paint.paint_type}
        brands={brands}
        paintTypes={paintTypes}
      />

      {paint.is_discontinued && (
        <PaintSubstitutes sourcePaintId={paint.id} brands={brands} />
      )}
    </div>
  )
}
