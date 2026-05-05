'use client'

import { forwardRef } from 'react'
import { GripVertical } from 'lucide-react'

/**
 * Drag handle button for a sortable palette paint row.
 *
 * Renders a six-dot grip icon. dnd-kit attaches its pointer/keyboard listeners
 * here via `ref` and spread props from `useSortable`, keeping the rest of the
 * row (links, remove button) fully clickable.
 *
 * `touch-none` is required so the browser does not intercept vertical scroll
 * before the touch sensor's long-press threshold fires.
 *
 * @param props['aria-label'] - Accessible label for the handle button; defaults to "Reorder paint".
 */
export const PaletteDragHandle = forwardRef<HTMLButtonElement, { 'aria-label'?: string } & Record<string, unknown>>(
  function PaletteDragHandle({ 'aria-label': ariaLabel, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel ?? 'Reorder paint'}
        aria-roledescription="draggable"
        className="btn btn-ghost btn-xs cursor-grab touch-none px-1 active:cursor-grabbing self-start mt-0.5"
        {...rest}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
    )
  },
)
