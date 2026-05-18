'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import {
  removePaintHueAssociation,
  bulkRemovePaintHueAssociations,
} from '@/modules/admin/actions/hue-actions'
import type { PaintWithRelations } from '@/modules/paints/services/paint-service'

/**
 * Props for {@link HuePaintList}.
 */
type HuePaintListProps = {
  /** List of paints currently associated with this hue. */
  paints: PaintWithRelations[]
  /** The UUID of the hue being managed (used for form hidden fields and revalidation). */
  hueId: string
}

/**
 * Submit button for bulk remove that reflects pending state.
 */
function BulkRemoveButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-destructive btn-sm">
      {pending ? 'Removing…' : 'Remove Selected'}
    </button>
  )
}

/**
 * Client component displaying a table of paints associated with a hue.
 *
 * Allows selecting individual paints via checkboxes and bulk-removing their
 * hue assignment, or removing a single paint via an inline button.
 *
 * @param props - {@link HuePaintListProps}
 */
export function HuePaintList({ paints, hueId }: HuePaintListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkState, bulkFormAction] = useActionState(bulkRemovePaintHueAssociations, null)
  const [singleState, singleFormAction] = useActionState(removePaintHueAssociation, null)

  const allSelected = paints.length > 0 && selectedIds.size === paints.length

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paints.map((p) => p.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (paints.length === 0) {
    return <p className="text-sm text-muted-foreground">No paints associated with this hue.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk remove form */}
      <form action={bulkFormAction} className="flex items-center gap-3">
        <input type="hidden" name="paint_ids" value={Array.from(selectedIds).join(',')} />
        <input type="hidden" name="hue_id" value={hueId} />
        <BulkRemoveButton />
        {selectedIds.size > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
        )}
        {bulkState?.error && (
          <span className="text-sm text-destructive">{bulkState.error}</span>
        )}
        {bulkState?.success && (
          <span className="text-sm text-green-600">
            Removed {bulkState.removed_count} paint{bulkState.removed_count !== 1 ? 's' : ''}.
          </span>
        )}
      </form>

      {singleState?.error && (
        <p className="text-sm text-destructive">{singleState.error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="checkbox checkbox-sm"
                  aria-label="Select all paints"
                />
              </th>
              <th className="pb-2 pr-3 w-8">Color</th>
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Brand</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paints.map((paint) => (
              <tr key={paint.id} className="border-b border-border/50">
                <td className="py-2 pr-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(paint.id)}
                    onChange={() => toggleOne(paint.id)}
                    className="checkbox checkbox-sm"
                    aria-label={`Select ${paint.name}`}
                  />
                </td>
                <td className="py-2 pr-3">
                  <span
                    className="inline-block h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: `#${paint.hex}` }}
                    aria-hidden="true"
                  />
                </td>
                <td className="py-2 pr-4 font-medium">{paint.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {paint.product_lines?.brands?.name ?? '—'}
                </td>
                <td className="py-2">
                  <form action={singleFormAction}>
                    <input type="hidden" name="paint_id" value={paint.id} />
                    <input type="hidden" name="hue_id" value={hueId} />
                    <button type="submit" className="btn btn-ghost btn-sm text-destructive">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
