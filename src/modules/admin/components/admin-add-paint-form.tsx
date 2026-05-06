'use client'

import { Check, Plus } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import SearchInput from '@/components/search'
import { addPaintToCollection } from '@/modules/admin/actions/add-paint-to-collection'
import { useDebouncedQuery } from '@/modules/paints/hooks/use-debounced-query'
import { usePaintSearch } from '@/modules/paints/hooks/use-paint-search'
import { useSearchUrlState } from '@/modules/paints/hooks/use-search-url-state'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

const PICKER_PAGE_SIZE = 10

/** Per-key history strategy for the picker URL sync. Defined outside the component for referential stability. */
const PICKER_URL_KEYS = { q: 'replace' } as const

function hydratePickerState(sp: URLSearchParams) {
  return { q: sp.get('q') ?? '' }
}

function serializePickerState(state: { q: string }) {
  const sp = new URLSearchParams()
  if (state.q) sp.set('q', state.q)
  return sp
}

/**
 * Inline paint-picker form that lets an admin add one or more paints to a user's collection.
 *
 * Debounces the search input 250ms (min 1 char), fetches up to 10 paint suggestions via
 * {@link usePaintSearch}, and calls {@link addPaintToCollection} when a suggestion is selected.
 * Suggestions remain open after each add so the admin can add multiple paints without re-typing.
 * Paints added in this session are tracked with a check icon to prevent duplicate adds.
 * The active query is synced to the URL via `replaceState` so the state is shareable.
 * Success and failure are surfaced as Sonner toasts.
 *
 * @param props.userId - UUID of the target user whose collection is being modified.
 * @param props.initialQuery - Pre-filled query string, typically parsed from the URL by the page.
 * @param props.onAdded - Called after a paint is successfully added. Use to trigger a refresh of sibling components.
 */
export function AdminAddPaintForm({
  userId,
  initialQuery = '',
  onAdded,
}: {
  userId: string
  initialQuery?: string
  onAdded?: () => void
}) {
  const basePath = `/admin/users/${userId}/collection`

  const { update } = useSearchUrlState({
    keys: PICKER_URL_KEYS,
    hydrate: hydratePickerState,
    serialize: serializePickerState,
    basePath,
    initialState: { q: initialQuery },
  })

  const [inputValue, setInputValue] = useState(initialQuery)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const debouncedQuery = useDebouncedQuery(inputValue, { delay: 250, minChars: 1 })

  useEffect(() => {
    update({ q: debouncedQuery }, { commit: false })
  }, [debouncedQuery, update])

  const { paints } = usePaintSearch({
    query: debouncedQuery || undefined,
    pageSize: PICKER_PAGE_SIZE,
    page: 1,
    scope: 'all',
  })

  const showSuggestions = inputValue.trim().length > 0 && paints.length > 0

  function handleSelect(paint: PaintWithBrand) {
    if (addedIds.has(paint.id)) return
    startTransition(async () => {
      const result = await addPaintToCollection(userId, paint.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setAddedIds((prev) => new Set(prev).add(paint.id))
      onAdded?.()
      toast.success(`Added '${paint.name}'`)
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Add paint to collection</p>
      <SearchInput
        placeholder="Search paints by name, brand, or type…"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {showSuggestions && (
        <ul className="rounded-md border border-border bg-popover shadow-md">
          {paints.map((paint) => {
            const isAdded = addedIds.has(paint.id)
            return (
              <li key={paint.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                  onClick={() => handleSelect(paint)}
                  disabled={isPending || isAdded}
                >
                  <span
                    className="size-5 shrink-0 rounded border border-border"
                    style={{ backgroundColor: paint.hex }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate font-medium">{paint.name}</span>
                  {paint.paint_type && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {paint.paint_type}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {paint.product_lines.brands.name}
                  </span>
                  {isAdded ? (
                    <Check className="size-3.5 shrink-0 text-green-600" />
                  ) : (
                    <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
