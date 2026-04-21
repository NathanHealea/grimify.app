'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import SearchInput from '@/components/search'
import { PaintCard } from '@/modules/paints/components/paint-card'
import { searchCollection } from '@/modules/collection/actions/search-collection'
import type { CollectionPaint } from '@/modules/collection/types/collection-paint'

/**
 * Client component that provides a debounced search over the user's collection.
 *
 * Calls the {@link searchCollection} server action 250ms after the user stops
 * typing. Results are rendered as a responsive grid of {@link PaintCard}s.
 * An empty query shows a hint; a non-empty query with no results shows a
 * "no paints found" message.
 */
export function CollectionSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollectionPaint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const result = await searchCollection(query.trim())
      setResults('paints' in result ? result.paints : [])
      setIsLoading(false)
    }, 250)

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

      {!query.trim() && (
        <p className="text-sm text-muted-foreground">Search your collection…</p>
      )}

      {query.trim() && !isLoading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No paints found.</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
