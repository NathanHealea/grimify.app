'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import type { Army } from '@/modules/armies/types/army'

/**
 * Builds a breadcrumb ancestry label for an army from a flat army map.
 *
 * Walks up the parent chain via `parent_id` until reaching a root node,
 * then joins all ancestor names with " › ".
 *
 * @param army - The army whose breadcrumb label to build.
 * @param armyMap - A `Map<id, Army>` built from the full flat army list.
 * @returns A breadcrumb label string (e.g., `"Imperium › Space Marines"`).
 */
function buildBreadcrumb(army: Army, armyMap: Map<string, Army>): string {
  const parts: string[] = []
  let current: Army | undefined = army

  while (current) {
    parts.unshift(current.name)
    current = current.parent_id ? armyMap.get(current.parent_id) : undefined
  }

  return parts.join(' › ')
}

/** A flat army option augmented with its computed breadcrumb label. */
type ArmyOption = Army & { label: string }

/**
 * Props for {@link ArmyCombobox}.
 */
type ArmyComboboxProps = {
  /** Flat list of all armies; breadcrumb labels are built in JS from this. */
  armies: Army[]
  /** Initially selected army ID, or `null`/`undefined` for no selection. */
  defaultValue?: string | null
  /** Name attribute for the hidden input (defaults to `"army_id"`). */
  name?: string
}

/**
 * Searchable combobox for associating a palette with an army.
 *
 * Accepts a flat `armies` list, builds a `Map<id, Army>` to compute ancestry
 * breadcrumb labels (e.g., `"Imperium › Space Marines › Dark Angels"`), and
 * provides text-based filtering of those labels.
 *
 * Includes a "None" / clear option so the user can unset the army. When a
 * selection is made, emits the army `id` via a hidden form `<input>` named by
 * the `name` prop. If the army has an `icon_url`, a 16×16 thumbnail is shown
 * next to the label.
 *
 * @param props - {@link ArmyComboboxProps}
 */
export function ArmyCombobox({ armies, defaultValue, name = 'army_id' }: ArmyComboboxProps) {
  // Build ancestry map and augmented option list once per render.
  const armyMap = new Map(armies.map((a) => [a.id, a]))
  const options: ArmyOption[] = armies.map((a) => ({
    ...a,
    label: buildBreadcrumb(a, armyMap),
  }))

  const initialArmy = defaultValue ? options.find((o) => o.id === defaultValue) ?? null : null

  const [selected, setSelected] = useState<ArmyOption | null>(initialArmy)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.length > 0
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  function handleSelect(option: ArmyOption | null) {
    setSelected(option)
    setQuery('')
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
      {/* Hidden input carries the selected army ID for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ''} />

      {selected ? (
        /* Selected state — show the selected army with a clear button */
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          {selected.icon_url && (
            <img
              src={selected.icon_url}
              alt={selected.name}
              className="h-4 w-4 shrink-0 rounded object-contain"
            />
          )}
          <span className="flex-1 truncate">{selected.label}</span>
          <button
            type="button"
            aria-label="Clear army selection"
            onClick={() => handleSelect(null)}
            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        /* Search state — text input to filter options */
        <input
          type="text"
          placeholder="Search armies…"
          value={query}
          autoComplete="off"
          className="input input-sm w-full"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      )}

      {/* Dropdown list */}
      {open && !selected && (
        <ul className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
          {/* None option */}
          <li>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => handleSelect(null)}
            >
              — None —
            </button>
          </li>
          {filtered.length === 0 && query.length > 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No armies found.</li>
          ) : (
            filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => handleSelect(option)}
                >
                  {option.icon_url && (
                    <img
                      src={option.icon_url}
                      alt={option.name}
                      className="h-4 w-4 shrink-0 rounded object-contain"
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
