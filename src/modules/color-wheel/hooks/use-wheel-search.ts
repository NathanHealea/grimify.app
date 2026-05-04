'use client'

import { useMemo, useState } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Manages the paint search query and derives the set of matching paint IDs.
 *
 * Matches are computed against `name`, `brand_name`, and `product_line_name`
 * using a case-insensitive substring search. The returned `searchMatchIds` set
 * is empty when the query is blank, which signals the wheel to show all dots
 * at full opacity with no search-glow highlights.
 *
 * @param paints - The full (pre-filter) paint array to search within.
 * @returns `searchQuery`, `setSearchQuery`, and the derived `searchMatchIds` set.
 */
export function useWheelSearch(paints: ColorWheelPaint[]) {
  const [searchQuery, setSearchQuery] = useState('')

  const searchMatchIds = useMemo<Set<string>>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return new Set()
    const matched = new Set<string>()
    for (const paint of paints) {
      if (
        paint.name.toLowerCase().includes(q) ||
        paint.brand_name.toLowerCase().includes(q) ||
        paint.product_line_name.toLowerCase().includes(q)
      ) {
        matched.add(paint.id)
      }
    }
    return matched
  }, [paints, searchQuery])

  return { searchQuery, setSearchQuery, searchMatchIds }
}
