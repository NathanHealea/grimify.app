'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'

import type { Hue } from '@/types/color'

/**
 * Props for {@link HueSelector}.
 */
type HueSelectorProps = {
  /** All top-level (parent) hues available for selection. */
  parentHues: Hue[]
  /** Map of parent hue ID to its child hues. */
  childHuesByParent: Record<string, Hue[]>
  /** Pre-selected parent hue ID (for edit mode). */
  defaultParentHueId?: string
  /** Pre-selected child hue ID (for edit mode). */
  defaultChildHueId?: string
}

/**
 * Two-step hue selection component for the paint form.
 *
 * Renders a parent hue dropdown and a dependent child hue dropdown.
 * Selecting a parent populates the child options; clearing the parent
 * clears the child selection. Color swatches are shown beside each
 * selected label using inline preview divs.
 *
 * Outputs hidden inputs `parent_hue_id` and `child_hue_id` for use
 * by the parent form's server action.
 *
 * @param props - {@link HueSelectorProps}
 */
export function HueSelector({
  parentHues,
  childHuesByParent,
  defaultParentHueId,
  defaultChildHueId,
}: HueSelectorProps) {
  const [parentId, setParentId] = useState(defaultParentHueId ?? '')
  const [childId, setChildId] = useState(defaultChildHueId ?? '')

  const selectedParent = parentHues.find((h) => h.id === parentId)
  const childHues = parentId ? (childHuesByParent[parentId] ?? []) : []
  const selectedChild = childHues.find((h) => h.id === childId)

  function handleParentChange(e: ChangeEvent<HTMLSelectElement>) {
    const newParentId = e.target.value
    setParentId(newParentId)

    // Clear child if the new parent doesn't include the current child
    const newChildren = newParentId ? (childHuesByParent[newParentId] ?? []) : []
    if (!newChildren.find((c) => c.id === childId)) {
      setChildId('')
    }
  }

  function handleChildChange(e: ChangeEvent<HTMLSelectElement>) {
    setChildId(e.target.value)
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="parent_hue_id" value={parentId} />
      <input type="hidden" name="child_hue_id" value={childId} />

      {/* Parent hue */}
      <div className="flex flex-col gap-1">
        <label htmlFor="parent-hue-select" className="form-label text-sm">
          Parent Hue
        </label>
        <div className="flex items-center gap-2">
          {selectedParent && (
            <span
              className="inline-block h-5 w-5 flex-shrink-0 rounded border border-border"
              style={{ backgroundColor: selectedParent.hex_code }}
              aria-hidden="true"
            />
          )}
          <select
            id="parent-hue-select"
            value={parentId}
            onChange={handleParentChange}
            className="input input-sm flex-1"
          >
            <option value="">— None —</option>
            {parentHues.map((hue) => (
              <option key={hue.id} value={hue.id}>
                {hue.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Child (sub) hue */}
      <div className="flex flex-col gap-1">
        <label htmlFor="child-hue-select" className="form-label text-sm">
          Child Sub-Hue
        </label>
        <div className="flex items-center gap-2">
          {selectedChild && (
            <span
              className="inline-block h-5 w-5 flex-shrink-0 rounded border border-border"
              style={{ backgroundColor: selectedChild.hex_code }}
              aria-hidden="true"
            />
          )}
          <select
            id="child-hue-select"
            value={childId}
            onChange={handleChildChange}
            disabled={!parentId || childHues.length === 0}
            className="input input-sm flex-1"
          >
            <option value="">— None —</option>
            {childHues.map((hue) => (
              <option key={hue.id} value={hue.id}>
                {hue.name}
              </option>
            ))}
          </select>
        </div>
        {!parentId && (
          <p className="text-xs text-muted-foreground">Select a parent hue first.</p>
        )}
      </div>
    </div>
  )
}
