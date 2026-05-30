'use client'

import { PaintFilterPopover } from '@/modules/paints/components/paint-filter-popover'
import type { PaintFacetCounts } from '@/modules/paints/types/paint-facet-counts'
import type { PaintFilterState } from '@/modules/paints/types/paint-filter-state'
import { UNTYPED_PAINT_TYPE } from '@/modules/paints/types/paint-filter-state'
import { cn } from '@/lib/utils'

/**
 * Presentational filter bar for the public paint explorer.
 *
 * Renders Brand, Paint Type, and Product Line popovers; a Discontinued
 * tri-state chip; a Metallic-only chip; and a removable active-filter chip
 * row. Fully controlled — no internal state, no fetching.
 *
 * The Product Line popover is disabled when no brand is selected, and lists
 * only the product lines belonging to the currently selected brand(s).
 *
 * @param props.state - Current filter state from {@link usePaintFilters}.
 * @param props.counts - Per-option counts from {@link usePaintFacetCounts}.
 * @param props.brands - All brands available for selection.
 * @param props.paintTypes - All distinct paint type strings available for selection.
 * @param props.productLines - All product lines, used to derive the brand-gated line list.
 * @param props.onToggleBrand - Called with brand ID when a brand checkbox changes.
 * @param props.onTogglePaintType - Called with type name when a type checkbox changes.
 * @param props.onToggleProductLine - Called with line ID when a line checkbox changes.
 * @param props.onCycleDiscontinued - Called when the discontinued chip is clicked.
 * @param props.onToggleMetallicOnly - Called when the metallic chip is clicked.
 * @param props.onRemoveFilter - Called when a chip's remove button is clicked.
 */
export function PaintFilterBar({
  state,
  counts,
  brands,
  paintTypes,
  productLines,
  onToggleBrand,
  onTogglePaintType,
  onToggleProductLine,
  onCycleDiscontinued,
  onToggleMetallicOnly,
  onRemoveFilter,
}: {
  state: PaintFilterState
  counts: PaintFacetCounts
  brands: { id: number; name: string }[]
  paintTypes: string[]
  productLines: { id: number; brand_id: number; name: string }[]
  onToggleBrand: (id: number) => void
  onTogglePaintType: (name: string) => void
  onToggleProductLine: (id: number) => void
  onCycleDiscontinued: () => void
  onToggleMetallicOnly: () => void
  onRemoveFilter: (
    kind: 'brand' | 'type' | 'line' | 'disc' | 'metal',
    value?: string | number
  ) => void
}) {
  // Only show product lines that belong to a selected brand
  const visibleProductLines =
    state.brandIds.length > 0
      ? productLines.filter((pl) => state.brandIds.includes(pl.brand_id))
      : []

  // Build lookup maps for chip labels
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]))
  const lineNameById = new Map(productLines.map((l) => [l.id, l.name]))

  // Discontinued chip label and variant
  const discLabel =
    state.discontinued === 'exclude'
      ? 'Hide discontinued'
      : state.discontinued === 'only'
        ? 'Discontinued only'
        : 'Include discontinued'

  const discClassName =
    state.discontinued === 'only'
      ? 'btn btn-primary btn-sm'
      : state.discontinued === 'exclude'
        ? 'btn btn-outline btn-sm'
        : 'btn btn-ghost btn-sm'

  const hasActiveFilters =
    state.brandIds.length > 0 ||
    state.paintTypes.length > 0 ||
    state.productLineIds.length > 0 ||
    state.discontinued !== 'include' ||
    state.metallicOnly

  return (
    <div className="flex flex-col gap-2">
      {/* Popover row */}
      <div className="flex flex-wrap items-center gap-2">
        <PaintFilterPopover
          label="Brand"
          options={brands.map((b) => ({ id: String(b.id), name: b.name }))}
          counts={counts.brand}
          selectedIds={state.brandIds.map(String)}
          onToggle={(id) => onToggleBrand(Number(id))}
        />

        {/* Paint type filter — temporarily hidden, logic preserved
        <PaintFilterPopover
          label="Paint type"
          options={[
            ...paintTypes.map((t) => ({ id: t.toLowerCase(), name: t })),
            ...(counts.type[UNTYPED_PAINT_TYPE.toLowerCase()] > 0
              ? [{ id: UNTYPED_PAINT_TYPE.toLowerCase(), name: UNTYPED_PAINT_TYPE }]
              : []),
          ]}
          counts={counts.type}
          selectedIds={state.paintTypes.map((t) => t.toLowerCase())}
          onToggle={(id) => onTogglePaintType(id)}
          emptyMessage="No types available."
        />
        */}

        <PaintFilterPopover
          label="Product line"
          options={visibleProductLines.map((l) => ({ id: String(l.id), name: l.name }))}
          counts={counts.line}
          selectedIds={state.productLineIds.map(String)}
          onToggle={(id) => onToggleProductLine(Number(id))}
          disabled={state.brandIds.length === 0}
          emptyMessage="No product lines for the selected brand(s)."
        />

        <button
          type="button"
          onClick={onCycleDiscontinued}
          className={discLabel === 'Include discontinued' ? 'btn btn-ghost btn-sm text-muted-foreground' : discClassName}
        >
          {discLabel}
        </button>

        <button
          type="button"
          onClick={onToggleMetallicOnly}
          className={cn(
            'btn btn-sm',
            state.metallicOnly ? 'btn-primary' : 'btn-outline'
          )}
        >
          Metallic only
        </button>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {state.brandIds.map((id) => (
            <FilterChip
              key={`brand-${id}`}
              label={`Brand: ${brandNameById.get(id) ?? id}`}
              onRemove={() => onRemoveFilter('brand', id)}
            />
          ))}
          {state.paintTypes.map((type) => (
            <FilterChip
              key={`type-${type}`}
              label={`Type: ${type}`}
              onRemove={() => onRemoveFilter('type', type)}
            />
          ))}
          {state.productLineIds.map((id) => (
            <FilterChip
              key={`line-${id}`}
              label={`Line: ${lineNameById.get(id) ?? id}`}
              onRemove={() => onRemoveFilter('line', id)}
            />
          ))}
          {state.discontinued !== 'include' && (
            <FilterChip
              label={state.discontinued === 'exclude' ? 'Hide discontinued' : 'Discontinued only'}
              onRemove={() => onRemoveFilter('disc')}
            />
          )}
          {state.metallicOnly && (
            <FilterChip
              label="Metallic only"
              onRemove={() => onRemoveFilter('metal')}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Removable filter chip styled to match {@link PaintSimilarSection}. */
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
