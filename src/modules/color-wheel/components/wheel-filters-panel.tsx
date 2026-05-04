'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { WheelFilterState } from '@/modules/color-wheel/types/wheel-filter-state'
import type { FilterOptions } from '@/modules/color-wheel/utils/derive-filter-options'

/**
 * Collapsible filter panel for the color wheel.
 *
 * Renders a paint search input, brand multi-select checkboxes, product line
 * checkboxes (scoped to selected brands), paint type toggles, an optional
 * "My collection" toggle, and dot-decoration toggles (brand ring, owned ring).
 * Active filters are shown as removable chips below the toggle button and are
 * always visible regardless of open/closed state.
 *
 * @param options - Available filter options derived from the full paint array.
 * @param state - Current active filter selections.
 * @param searchQuery - Current search query string.
 * @param showOwnedFilter - Whether to show the "My collection" toggle (true when user is authenticated).
 * @param showBrandRing - Whether the brand-ring decoration is enabled.
 * @param showOwnedRing - Whether the owned-ring decoration is enabled.
 * @param onSearchChange - Called with the new query string when the search input changes.
 * @param onBrandChange - Called with the new brand ID array when brand selection changes.
 * @param onProductLineChange - Called with the new product line ID array when line selection changes.
 * @param onPaintTypeChange - Called with the new paint type array when type selection changes.
 * @param onOwnedOnlyChange - Called with the new boolean when the owned-only toggle changes.
 * @param onBrandRingChange - Called with the new boolean when the brand-ring toggle changes.
 * @param onOwnedRingChange - Called with the new boolean when the owned-ring toggle changes.
 * @param onClearAll - Called when the user clears all active filters.
 * @param onRemoveFilter - Called to remove a single active filter chip.
 */
export function WheelFiltersPanel({
  options,
  state,
  searchQuery,
  showOwnedFilter,
  showBrandRing,
  showOwnedRing,
  onSearchChange,
  onBrandChange,
  onProductLineChange,
  onPaintTypeChange,
  onOwnedOnlyChange,
  onBrandRingChange,
  onOwnedRingChange,
  onClearAll,
  onRemoveFilter,
}: {
  options: FilterOptions
  state: WheelFilterState
  searchQuery: string
  showOwnedFilter: boolean
  showBrandRing: boolean
  showOwnedRing: boolean
  onSearchChange: (query: string) => void
  onBrandChange: (ids: string[]) => void
  onProductLineChange: (ids: string[]) => void
  onPaintTypeChange: (types: string[]) => void
  onOwnedOnlyChange: (value: boolean) => void
  onBrandRingChange: (value: boolean) => void
  onOwnedRingChange: (value: boolean) => void
  onClearAll: () => void
  onRemoveFilter: (kind: 'brand' | 'line' | 'type' | 'owned', value?: string) => void
}) {
  const [open, setOpen] = useState(false)

  const activeCount =
    state.brandIds.length +
    state.productLineIds.length +
    state.paintTypes.length +
    (state.ownedOnly ? 1 : 0)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const visibleProductLines = state.brandIds.length > 0
    ? options.productLines.filter((pl) => state.brandIds.includes(pl.brand_id))
    : options.productLines

  function toggleBrand(id: string) {
    const next = state.brandIds.includes(id)
      ? state.brandIds.filter((b) => b !== id)
      : [...state.brandIds, id]
    onBrandChange(next)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function toggleProductLine(id: string) {
    const next = state.productLineIds.includes(id)
      ? state.productLineIds.filter((l) => l !== id)
      : [...state.productLineIds, id]
    onProductLineChange(next)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function togglePaintType(type: string) {
    const next = state.paintTypes.includes(type)
      ? state.paintTypes.filter((t) => t !== type)
      : [...state.paintTypes, type]
    onPaintTypeChange(next)
  }

  const brandById = new Map(options.brands.map((b) => [b.id, b.name]))
  const lineById = new Map(options.productLines.map((l) => [l.id, l.name]))

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
      {/* Search input */}
      <div className="pointer-events-auto">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search paints…"
          className="input input-sm w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Search paints"
        />
      </div>

      {/* Toggle button row */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'btn btn-sm',
            open ? 'btn-primary' : 'btn-outline',
          )}
          aria-expanded={open}
          aria-label="Toggle filters"
        >
          <FilterIcon />
          Filters
          {activeCount > 0 && (
            <span className="badge badge-sm badge-primary ml-0.5">{activeCount}</span>
          )}
        </button>

        {activeCount > 0 && !open && (
          <button
            type="button"
            onClick={onClearAll}
            className="btn btn-ghost btn-sm text-muted-foreground"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips — visible when panel is closed */}
      {!open && activeCount > 0 && (
        <div className="pointer-events-auto flex flex-wrap gap-1">
          {state.brandIds.map((id) => (
            <FilterChip
              key={`brand-${id}`}
              label={brandById.get(id) ?? id}
              onRemove={() => onRemoveFilter('brand', id)}
            />
          ))}
          {state.productLineIds.map((id) => (
            <FilterChip
              key={`line-${id}`}
              label={lineById.get(id) ?? id}
              onRemove={() => onRemoveFilter('line', id)}
            />
          ))}
          {state.paintTypes.map((type) => (
            <FilterChip
              key={`type-${type}`}
              label={type}
              onRemove={() => onRemoveFilter('type', type)}
            />
          ))}
          {state.ownedOnly && (
            <FilterChip label="My collection" onRemove={() => onRemoveFilter('owned')} />
          )}
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="pointer-events-auto flex max-h-[70vh] w-64 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-background p-4 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Filters</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="btn btn-ghost btn-xs text-muted-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Brands */}
          {options.brands.length > 0 && (
            <FilterSection label="Brand">
              {options.brands.map((brand) => (
                <CheckRow
                  key={brand.id}
                  label={brand.name}
                  checked={state.brandIds.includes(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                />
              ))}
            </FilterSection>
          )}

          {/* Product lines — hidden for now, logic retained */}
          {/* Paint types — hidden for now, logic retained */}

          {/* My collection toggle */}
          {showOwnedFilter && (
            <FilterSection label="Collection">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span>My collection only</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-primary"
                  checked={state.ownedOnly}
                  onChange={(e) => onOwnedOnlyChange(e.target.checked)}
                />
              </label>
            </FilterSection>
          )}

          {/* Dot decoration toggles */}
          <FilterSection label="Display">
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span>Brand ring</span>
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={showBrandRing}
                onChange={(e) => onBrandRingChange(e.target.checked)}
              />
            </label>
            {showOwnedFilter && (
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span>Owned ring</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-primary"
                  checked={showOwnedRing}
                  onChange={(e) => onOwnedRingChange(e.target.checked)}
                />
              </label>
            )}
          </FilterSection>

          {/* Active chip summary at bottom of open panel */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-1 border-t border-border pt-3">
              {state.brandIds.map((id) => (
                <FilterChip
                  key={`brand-${id}`}
                  label={brandById.get(id) ?? id}
                  onRemove={() => onRemoveFilter('brand', id)}
                />
              ))}
              {state.productLineIds.map((id) => (
                <FilterChip
                  key={`line-${id}`}
                  label={lineById.get(id) ?? id}
                  onRemove={() => onRemoveFilter('line', id)}
                />
              ))}
              {state.paintTypes.map((type) => (
                <FilterChip
                  key={`type-${type}`}
                  label={type}
                  onRemove={() => onRemoveFilter('type', type)}
                />
              ))}
              {state.ownedOnly && (
                <FilterChip label="My collection" onRemove={() => onRemoveFilter('owned')} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-primary"
        checked={checked}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="badge badge-soft badge-sm inline-flex items-center gap-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-foreground"
        aria-label={`Remove ${label} filter`}
      >
        ✕
      </button>
    </span>
  )
}

function FilterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}
