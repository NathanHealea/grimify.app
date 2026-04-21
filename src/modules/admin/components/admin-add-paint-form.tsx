'use client'

import { Plus } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'

import SearchInput from '@/components/search'
import { addPaintToCollection } from '@/modules/admin/actions/add-paint-to-collection'
import { searchPaintsForPicker } from '@/modules/admin/actions/search-paints-for-picker'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Inline paint-picker form that lets an admin add a paint to a user's collection.
 *
 * Debounces the search input 250ms, fetches up to 10 paint suggestions via
 * {@link searchPaintsForPicker}, and calls {@link addPaintToCollection} when
 * a suggestion is selected. Clears the input on success.
 *
 * @param props.userId - UUID of the target user whose collection is being modified.
 */
export function AdminAddPaintForm({ userId }: { userId: string }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PaintWithBrand[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const result = await searchPaintsForPicker(trimmed)
      setSuggestions('paints' in result ? result.paints : [])
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelect(paint: PaintWithBrand) {
    setError(null)
    startTransition(async () => {
      const result = await addPaintToCollection(userId, paint.id)
      if (result.error) {
        setError(result.error)
      } else {
        setQuery('')
        setSuggestions([])
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Add paint to collection</p>
      <SearchInput
        placeholder="Search paints by name, brand, or #hex…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {suggestions.length > 0 && (
        <ul className="rounded-md border border-border bg-popover shadow-md">
          {suggestions.map((paint) => (
            <li key={paint.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                onClick={() => handleSelect(paint)}
                disabled={isPending}
              >
                <span
                  className="size-5 shrink-0 rounded border border-border"
                  style={{ backgroundColor: paint.hex }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate font-medium">{paint.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {paint.product_lines.brands.name}
                </span>
                <Plus className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
