'use client'

import { SearchIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Searchable combobox for selecting a paint from a live-filtered dropdown.
 *
 * Displays a search input; as the user types, up to `maxResults` matching paints
 * appear in a dropdown. Selecting a paint calls `onSelect` and clears the input.
 * The X button clears the query without triggering `onSelect`.
 *
 * @param props.paints - Full paint list to filter against.
 * @param props.onSelect - Called with the chosen {@link ColorWheelPaint} on selection.
 * @param props.placeholder - Placeholder text for the search input.
 * @param props.maxResults - Maximum number of dropdown results (default: 8).
 */
export function SchemePaintCombox({
  paints,
  onSelect,
  placeholder = 'Search paints by name…',
  maxResults = 8,
  initialQuery = '',
}: {
  paints: ColorWheelPaint[]
  onSelect: (paint: ColorWheelPaint) => void
  placeholder?: string
  maxResults?: number
  /** Pre-fills the search query, e.g. when a selection is cleared mid-typing. */
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedPaint, setSelectedPaint] = useState<ColorWheelPaint | null>(null)

  const results =
    query.length > 0
      ? paints.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, maxResults)
      : []

  function handleSelect(paint: ColorWheelPaint) {
    onSelect(paint)
    setSelectedPaint(paint)
    setQuery(paint.name)
    setOpen(false)
  }

  function handleClear() {
    setQuery('')
    setSelectedPaint(null)
    setOpen(false)
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <InputGroup>
        <InputGroupAddon>
          {selectedPaint ? (
            <span
              className="inline-block size-5 shrink-0 rounded border border-border"
              style={{ backgroundColor: selectedPaint.hex }}
              aria-hidden="true"
            />
          ) : (
            <SearchIcon className="size-4" />
          )}
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(e.target.value.length > 0)
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Clear search" title="Clear" size="icon-xs" onClick={handleClear}>
              <X className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {open && results.length > 0 && (
        <ul className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
          {results.map((paint) => (
            <li key={paint.id}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                onClick={() => handleSelect(paint)}
              >
                <span
                  className="inline-block size-5 shrink-0 rounded border border-border"
                  style={{ backgroundColor: paint.hex }}
                  aria-hidden="true"
                />
                <span className="truncate">{paint.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{paint.brand_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
