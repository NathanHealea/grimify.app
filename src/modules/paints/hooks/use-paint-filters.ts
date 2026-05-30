'use client'

import { useCallback, useState } from 'react'

import {
  EMPTY_PAINT_FILTER_STATE,
  type PaintFilterState,
} from '@/modules/paints/types/paint-filter-state'

/**
 * Manages the multi-dimensional filter state for the public paint explorer.
 *
 * Owns brand, paint-type, product-line, discontinued, and metallic-only
 * selections. Composes alongside {@link useHueFilter} — does not absorb it.
 *
 * When the brand selection changes, any selected product lines that no longer
 * belong to a selected brand are automatically pruned to prevent stale-line
 * state in the URL.
 *
 * @param options.initial - Initial filter state, typically hydrated from the URL.
 * @param options.productLines - All product lines with their `brand_id`, used to
 *   prune stale line selections when the brand set changes.
 */
export function usePaintFilters(options: {
  initial: PaintFilterState
  productLines?: { id: number; brand_id: number; name: string }[]
}): {
  state: PaintFilterState
  toggleBrand: (id: number) => void
  togglePaintType: (name: string) => void
  toggleProductLine: (id: number) => void
  cycleDiscontinued: () => void
  toggleMetallicOnly: () => void
  setState: (next: PaintFilterState) => void
  clear: () => void
} {
  const { initial, productLines = [] } = options
  const [state, setState] = useState<PaintFilterState>(initial)

  const toggleBrand = useCallback(
    (id: number) => {
      setState((prev) => {
        const brandIds = prev.brandIds.includes(id)
          ? prev.brandIds.filter((b) => b !== id)
          : [...prev.brandIds, id]

        // Prune product lines that no longer belong to any selected brand
        const validLineIds = new Set(
          productLines
            .filter((pl) => brandIds.includes(pl.brand_id))
            .map((pl) => pl.id)
        )
        const productLineIds = prev.productLineIds.filter((lid) => validLineIds.has(lid))

        return { ...prev, brandIds, productLineIds }
      })
    },
    [productLines]
  )

  const togglePaintType = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      paintTypes: prev.paintTypes.includes(name)
        ? prev.paintTypes.filter((t) => t !== name)
        : [...prev.paintTypes, name],
    }))
  }, [])

  const toggleProductLine = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      productLineIds: prev.productLineIds.includes(id)
        ? prev.productLineIds.filter((l) => l !== id)
        : [...prev.productLineIds, id],
    }))
  }, [])

  const cycleDiscontinued = useCallback(() => {
    setState((prev) => {
      const next: PaintFilterState['discontinued'] =
        prev.discontinued === 'include'
          ? 'exclude'
          : prev.discontinued === 'exclude'
            ? 'only'
            : 'include'
      return { ...prev, discontinued: next }
    })
  }, [])

  const toggleMetallicOnly = useCallback(() => {
    setState((prev) => ({ ...prev, metallicOnly: !prev.metallicOnly }))
  }, [])

  const clear = useCallback(() => {
    setState(EMPTY_PAINT_FILTER_STATE)
  }, [])

  return {
    state,
    toggleBrand,
    togglePaintType,
    toggleProductLine,
    cycleDiscontinued,
    toggleMetallicOnly,
    setState,
    clear,
  }
}
