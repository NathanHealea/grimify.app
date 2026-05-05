import { cn } from '@/lib/utils'

const SIZE_PX = { sm: 16, md: 28, lg: 40 } as const

/**
 * Horizontal strip of color swatches for a palette.
 *
 * Renders square cells filled with each hex color. When `hexes.length > max`,
 * the first `max` cells are shown and a "+N" badge indicates the overflow.
 * An empty `hexes` array renders a single dashed placeholder cell.
 *
 * @param hexes - Ordered list of hex color strings (e.g. `["#a1b2c3"]`).
 * @param size - Cell size variant; defaults to `"md"` (28 px).
 * @param max - Maximum cells before overflow badge; defaults to 16.
 * @param className - Additional class names applied to the wrapper.
 */
export function PaletteSwatchStrip({
  hexes,
  size = 'md',
  max = 16,
  className,
}: {
  hexes: string[]
  size?: 'sm' | 'md' | 'lg'
  max?: number
  className?: string
}) {
  const px = SIZE_PX[size]
  const visible = hexes.slice(0, max)
  const overflow = hexes.length - visible.length

  return (
    <div className={cn('flex flex-wrap gap-0.5', className)}>
      {visible.length === 0 ? (
        <div
          style={{ width: px, height: px }}
          className="rounded-sm border border-dashed border-muted-foreground/40 bg-transparent"
        />
      ) : (
        visible.map((hex, i) => (
          <div
            key={i}
            style={{ backgroundColor: hex, width: px, height: px }}
            className="rounded-sm"
            title={hex}
          />
        ))
      )}
      {overflow > 0 && (
        <div
          style={{ height: px }}
          className="badge badge-soft flex items-center px-1 text-xs"
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
