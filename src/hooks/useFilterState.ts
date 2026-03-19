'use client'

import { useCallback, useState } from 'react'

import type { ColorScheme } from '@/types/paint'

export interface UseFilterStateOptions {
  onSelectionReset?: () => void
}

export function useFilterState(options: UseFilterStateOptions = {}) {
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set())
  const [colorScheme, setColorScheme] = useState<ColorScheme>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [ownedFilter, setOwnedFilter] = useState(false)
  const [showBrandRing, setShowBrandRing] = useState(false)
  const [showOwnedRing, setShowOwnedRing] = useState(false)

  const isFiltered = brandFilter.size > 0
  const isSearching = searchQuery.trim().length > 0

  const handleBrandFilter = useCallback(
    (id: string) => {
      setBrandFilter((prev) => {
        if (id === 'all') return new Set()
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
      options.onSelectionReset?.()
    },
    [options],
  )

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    options.onSelectionReset?.()
  }, [options])

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      options.onSelectionReset?.()
    },
    [options],
  )

  const toggleOwnedFilter = useCallback(() => {
    setOwnedFilter((prev) => !prev)
    options.onSelectionReset?.()
  }, [options])

  const toggleBrandRing = useCallback(() => {
    setShowBrandRing((prev) => !prev)
  }, [])

  const toggleOwnedRing = useCallback(() => {
    setShowOwnedRing((prev) => !prev)
  }, [])

  return {
    // State
    brandFilter,
    colorScheme,
    searchQuery,
    ownedFilter,
    showBrandRing,
    showOwnedRing,
    // Handlers
    handleBrandFilter,
    setColorScheme,
    setSearchQuery: handleSearchChange,
    clearSearch,
    toggleOwnedFilter,
    toggleBrandRing,
    toggleOwnedRing,
    // Derived flags
    isFiltered,
    isSearching,
  }
}
