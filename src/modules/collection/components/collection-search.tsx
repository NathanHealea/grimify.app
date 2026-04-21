'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import SearchInput from '@/components/search'
import { PaintCard } from '@/modules/paints/components/paint-card'
import { searchCollection } from '@/modules/collection/actions/search-collection'
import type { CollectionPaint } from '@/modules/collection/types/collection-paint'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Client component that provides a debounced search over the user's collection.
 *
 * When the query is empty, displays the 10 most recently added paints passed
 * in via `initialPaints`. When the user types, calls the {@link searchCollection}
 * server action 250ms after they stop and replaces the grid with results.
 *
 * @param props.initialPaints - The 10 most recently added paints, server-fetched.
 */
export function CollectionSearch({ initialPaints }: { initialPaints: PaintWithBrand[] }) {
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
      const result = await searchCollection(trimmed)
      setResults('paints' in result ? result.paints : [])
      setIsLoading(false)
    }, delay)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="space-y-4">
      <SearchInput
        placeholder="Search your collection by name, brand, type, or #hex…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!isSearching && initialPaints.length > 0 && (
        <>
          <p className="text-sm font-medium">Recently added</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {initialPaints.map((paint) => (
              <PaintCard
                key={paint.id}
                id={paint.id}
                name={paint.name}
                hex={paint.hex}
                brand={paint.product_lines.brands.name}
                paintType={paint.paint_type}
              />
            ))}
          </div>
        </>
      )}

      {isSearching && !isLoading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No paints found.</p>
      )}

      {isSearching && results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((paint) => (
            <PaintCard
              key={paint.id}
              id={paint.id}
              name={paint.name}
              hex={paint.hex}
              brand={paint.product_lines.brands.name}
              paintType={paint.paint_type}
            />
          ))}
        </div>
      )}

      <div className="text-right">
        <Link href="/collection/paints" className="text-sm text-muted-foreground hover:underline">
          View full collection →
        </Link>
      </div>
    </div>
  )
}
