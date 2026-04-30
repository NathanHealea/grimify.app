import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { WheelFilterState } from '@/modules/color-wheel/types/wheel-filter-state'

/**
 * Filters a paint array by the active wheel filter state.
 *
 * Filters are applied cheapest-first and short-circuit when a paint fails any
 * condition. `ownedOnly` is silently ignored when `userPaintIds` is undefined
 * so that deep-linked `?owned=1` URLs work gracefully for unauthenticated visitors.
 *
 * @param paints - Full paint array from the server.
 * @param state - Active filter selections.
 * @param userPaintIds - Set of paint IDs in the user's collection. Pass `undefined` when unauthenticated.
 * @returns Filtered paint array.
 */
export function applyWheelFilters(
  paints: ColorWheelPaint[],
  state: WheelFilterState,
  userPaintIds?: Set<string>,
): ColorWheelPaint[] {
  const { brandIds, productLineIds, paintTypes, ownedOnly } = state
  const noBrandFilter = brandIds.length === 0
  const noLineFilter = productLineIds.length === 0
  const noTypeFilter = paintTypes.length === 0
  const noOwnedFilter = !ownedOnly || userPaintIds === undefined

  if (noBrandFilter && noLineFilter && noTypeFilter && noOwnedFilter) return paints

  const brandSet = noBrandFilter ? null : new Set(brandIds)
  const lineSet = noLineFilter ? null : new Set(productLineIds)
  const typeSet = noTypeFilter ? null : new Set(paintTypes)

  return paints.filter((paint) => {
    if (!noOwnedFilter && !userPaintIds!.has(paint.id)) return false
    if (brandSet && !brandSet.has(paint.brand_id)) return false
    if (lineSet && !lineSet.has(paint.product_line_id)) return false
    if (typeSet) {
      if (paint.paint_type === null) return false
      if (!typeSet.has(paint.paint_type)) return false
    }
    return true
  })
}
