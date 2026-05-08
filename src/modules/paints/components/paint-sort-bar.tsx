'use client'

import { useState } from 'react'

import type { PaintSortDirection, PaintSortField } from '@/modules/paints/utils/sort-paints'
import { cn } from '@/lib/utils'

/** Display labels for each sort field. */
const FIELD_LABELS: Record<PaintSortField, string> = {
  name: 'Name',
  paint_type: 'Type',
  hue: 'Hue',
  saturation: 'Saturation',
  lightness: 'Lightness',
}

const FIELDS = Object.keys(FIELD_LABELS) as PaintSortField[]

/**
 * Controlled or uncontrolled sort field + direction bar for paint lists.
 *
 * Emits `onChange(field, direction)` on every change. Does not own persistence
 * or include an Apply button — consumers handle the commit semantics.
 *
 * @param props.field - Controlled field value (omit for uncontrolled).
 * @param props.direction - Controlled direction value (omit for uncontrolled).
 * @param props.defaultField - Initial field when uncontrolled (default `'name'`).
 * @param props.defaultDirection - Initial direction when uncontrolled (default `'asc'`).
 * @param props.onChange - Called with the new field and direction on any change.
 * @param props.disabled - Disables all controls.
 * @param props.className - Additional class names for the root element.
 */
export function PaintSortBar({
  field: controlledField,
  direction: controlledDirection,
  defaultField = 'name',
  defaultDirection = 'asc',
  onChange,
  disabled,
  className,
}: {
  field?: PaintSortField
  direction?: PaintSortDirection
  defaultField?: PaintSortField
  defaultDirection?: PaintSortDirection
  onChange: (field: PaintSortField, direction: PaintSortDirection) => void
  disabled?: boolean
  className?: string
}) {
  const [internalField, setInternalField] = useState<PaintSortField>(defaultField)
  const [internalDirection, setInternalDirection] = useState<PaintSortDirection>(defaultDirection)

  const field = controlledField ?? internalField
  const direction = controlledDirection ?? internalDirection

  function handleFieldChange(next: PaintSortField) {
    if (controlledField === undefined) setInternalField(next)
    onChange(next, direction)
  }

  function handleDirectionToggle() {
    const next: PaintSortDirection = direction === 'asc' ? 'desc' : 'asc'
    if (controlledDirection === undefined) setInternalDirection(next)
    onChange(field, next)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <select
        value={field}
        onChange={(e) => handleFieldChange(e.target.value as PaintSortField)}
        disabled={disabled}
        className="select select-sm"
        aria-label="Sort by"
      >
        {FIELDS.map((f) => (
          <option key={f} value={f}>
            {FIELD_LABELS[f]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleDirectionToggle}
        disabled={disabled}
        className="btn btn-sm btn-outline"
        aria-label={direction === 'asc' ? 'Ascending — click to switch to descending' : 'Descending — click to switch to ascending'}
      >
        {direction === 'asc' ? '↑ Asc' : '↓ Desc'}
      </button>
    </div>
  )
}
