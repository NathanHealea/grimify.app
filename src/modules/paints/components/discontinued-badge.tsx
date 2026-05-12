/**
 * Visual size token for {@link DiscontinuedBadge}.
 *
 * - `'sm'` — compact 10px text, suitable for `PaintCard` overlays.
 * - `'md'` — standard 12px text, suitable for `PaintDetail`.
 */
export type DiscontinuedBadgeSize = 'sm' | 'md'

/**
 * Pill badge that marks a paint as discontinued.
 *
 * Reused on `PaintDetail` (default `md`) and `PaintCard` (`sm`) so the
 * discontinued styling stays consistent across surfaces. Pure renderer —
 * no props beyond the optional size token.
 *
 * @param props.size - Visual size token. Defaults to `'md'`.
 */
export function DiscontinuedBadge({
  size = 'md',
}: {
  size?: DiscontinuedBadgeSize
} = {}) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center rounded-full bg-destructive/10 font-medium text-destructive ${sizeClass}`}
    >
      Discontinued
    </span>
  )
}
