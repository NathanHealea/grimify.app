'use client'

import { useCallback } from 'react'

import { useSearchUrlState } from '@/modules/paints/hooks/use-search-url-state'
import { EMPTY_FILTER_STATE } from '@/modules/color-wheel/types/wheel-filter-state'
import type { WheelFilterState } from '@/modules/color-wheel/types/wheel-filter-state'

function hydrate(sp: URLSearchParams): WheelFilterState {
  const brand = sp.get('brand')
  const line = sp.get('line')
  const type = sp.get('type')
  return {
    brandIds: brand ? brand.split(',').filter(Boolean) : [],
    productLineIds: line ? line.split(',').filter(Boolean) : [],
    paintTypes: type ? type.split(',').filter(Boolean) : [],
    ownedOnly: sp.get('owned') === '1',
  }
}

function serialize(state: WheelFilterState): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.brandIds.length > 0) sp.set('brand', state.brandIds.join(','))
  if (state.productLineIds.length > 0) sp.set('line', state.productLineIds.join(','))
  if (state.paintTypes.length > 0) sp.set('type', state.paintTypes.join(','))
  if (state.ownedOnly) sp.set('owned', '1')
  return sp
}

/**
 * Manages color wheel filter state with URL search-param sync.
 *
 * Each setter commits a push-history entry so the Back button retraces
 * filter changes. Built on {@link useSearchUrlState}.
 *
 * @returns Filter state and individual setter/clear functions.
 */
export function useWheelFilters() {
  const { state, update } = useSearchUrlState<WheelFilterState>({
    keys: { brandIds: 'push', productLineIds: 'push', paintTypes: 'push', ownedOnly: 'push' },
    hydrate,
    serialize,
    basePath: '/wheel',
    initialState: EMPTY_FILTER_STATE,
  })

  const setBrandIds = useCallback(
    (ids: string[]) => update({ brandIds: ids, productLineIds: [] }, { commit: true }),
    [update],
  )

  const setProductLineIds = useCallback(
    (ids: string[]) => update({ productLineIds: ids }, { commit: true }),
    [update],
  )

  const setPaintTypes = useCallback(
    (types: string[]) => update({ paintTypes: types }, { commit: true }),
    [update],
  )

  const setOwnedOnly = useCallback(
    (value: boolean) => update({ ownedOnly: value }, { commit: true }),
    [update],
  )

  const clearAll = useCallback(
    () => update(EMPTY_FILTER_STATE, { commit: true }),
    [update],
  )

  const removeFilter = useCallback(
    (kind: 'brand' | 'line' | 'type' | 'owned', value?: string) => {
      if (kind === 'brand') {
        const brandIds = state.brandIds.filter((id) => id !== value)
        const productLineIds = brandIds.length === 0 ? [] : state.productLineIds
        update({ brandIds, productLineIds }, { commit: true })
      } else if (kind === 'line') {
        update({ productLineIds: state.productLineIds.filter((id) => id !== value) }, { commit: true })
      } else if (kind === 'type') {
        update({ paintTypes: state.paintTypes.filter((t) => t !== value) }, { commit: true })
      } else {
        update({ ownedOnly: false }, { commit: true })
      }
    },
    [state, update],
  )

  return { state, setBrandIds, setProductLineIds, setPaintTypes, setOwnedOnly, clearAll, removeFilter }
}
