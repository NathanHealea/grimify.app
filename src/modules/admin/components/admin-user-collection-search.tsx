'use client'

import { useEffect, useRef, useState } from 'react'

import SearchInput from '@/components/search'
import { searchUserCollectionAction } from '@/modules/admin/actions/search-user-collection'
import { AdminCollectionPaintCard } from '@/modules/admin/components/admin-collection-paint-card'
import type { CollectionPaint } from '@/modules/collection/types/collection-paint'

/**
 * Debounced search over a target user's collection, displayed as a paint-card grid.
 *
 * When the query is empty, displays all paints passed in via `initialPaints`.
 * When the user types, calls {@link searchUserCollectionAction} 250ms after
 * they stop and replaces the grid with results. Mirrors the behavior of
 * `CollectionSearch` in `src/modules/collection/components/collection-search.tsx`.
 *
 * @param props.userId - UUID of the target user whose collection is being managed.
 * @param props.initialPaints - All paints in the user's collection, server-fetched.
 */
export function AdminUserCollectionSearch({
  userId,
  initialPaints,
}: {
  userId: string
  initialPaints: CollectionPaint[]
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollectionPaint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSearching = query.trim().length > 0

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    const delay = trimmed ? 250 : 0

    debounceRef.current = setTimeout(async () => {
      if (!trimmed) {
        setResults([])
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      const result = await searchUserCollectionAction(userId, trimmed)
      setResults('paints' in result ? result.paints : [])
      setIsLoading(false)
    }, delay)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, userId])

  const displayPaints = isSearching ? results : initialPaints

  return (
    <div className="space-y-4">
      <SearchInput
        placeholder="Search collection by name, brand, type, or #hex…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isSearching && !isLoading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No paints found.</p>
      )}

      {!isSearching && initialPaints.length === 0 && (
        <p className="text-sm text-muted-foreground">This user has no paints in their collection.</p>
      )}

      {displayPaints.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {displayPaints.map((paint) => (
            <AdminCollectionPaintCard
              key={paint.id}
              userId={userId}
              id={paint.id}
              name={paint.name}
              hex={paint.hex}
              brand={paint.product_lines.brands.name}
              paintType={paint.paint_type}
            />
          ))}
        </div>
      )}
    </div>
  )
}
