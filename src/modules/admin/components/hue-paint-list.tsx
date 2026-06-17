'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
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
 * Submit button inside a confirmation dialog form, reflects pending state.
 *
 * @param props.label - Button label text (default `"Remove"`).
 */
function ConfirmRemoveButton({ label = 'Remove' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-destructive btn-sm">
      {pending ? 'Removing…' : label}
    </Button>
  )
}

/**
 * Client component displaying a filterable table of paints associated with a hue.
 *
 * Supports selecting individual paints via checkboxes for bulk removal, or
 * removing a single paint via an inline button. Both remove paths require
 * confirmation via a modal dialog before the action is submitted.
 *
 * @param props - {@link HuePaintListProps}
 */
export function HuePaintList({ paints, hueId }: HuePaintListProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmPaintId, setConfirmPaintId] = useState<string | null>(null)
  const singleDialogRef = useRef<HTMLDialogElement>(null)
  const bulkDialogRef = useRef<HTMLDialogElement>(null)
  const [bulkState, bulkFormAction] = useActionState(bulkRemovePaintHueAssociations, null)
  const [singleState, singleFormAction] = useActionState(removePaintHueAssociation, null)

  const filteredPaints = inputValue.trim()
    ? paints.filter((p) => {
        const q = inputValue.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          (p.product_lines?.brands?.name ?? '').toLowerCase().includes(q)
        )
      })
    : paints

  const confirmPaint = paints.find((p) => p.id === confirmPaintId) ?? null
  const allSelected = filteredPaints.length > 0 && filteredPaints.every((p) => selectedIds.has(p.id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredPaints.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredPaints.forEach((p) => next.add(p.id))
        return next
      })
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

  useEffect(() => {
    if (singleState?.success) {
      singleDialogRef.current?.close()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfirmPaintId(null)
    }
  }, [singleState])

  useEffect(() => {
    if (bulkState?.success) {
      bulkDialogRef.current?.close()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIds(new Set())
    }
  }, [bulkState])

  if (paints.length === 0) {
    return <p className="text-sm text-muted-foreground">No paints associated with this hue.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search filter */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter paints…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input input-sm w-full max-w-sm"
          aria-label="Filter associated paints"
        />
        {inputValue.trim() && (
          <span className="text-sm text-muted-foreground">
            {filteredPaints.length} of {paints.length}
          </span>
        )}
      </div>

      {/* Bulk remove trigger */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={selectedIds.size === 0}
          onClick={() => bulkDialogRef.current?.showModal()}
          className="btn-destructive btn-sm"
        >
          Remove Selected
        </Button>
        {selectedIds.size > 0 && (
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
        )}
        {bulkState?.success && (
          <span className="text-sm text-green-600">
            Removed {bulkState.removed_count} paint{bulkState.removed_count !== 1 ? 's' : ''}.
          </span>
        )}
      </div>

      {singleState?.success && (
        <p className="text-sm text-green-600">Paint removed.</p>
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
            {filteredPaints.map((paint) => (
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
                    style={{ backgroundColor: paint.hex }}
                    aria-hidden="true"
                  />
                </td>
                <td className="py-2 pr-4 font-medium">{paint.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {paint.product_lines?.brands?.name ?? '—'}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/paints/${paint.id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                    <Button
                      type="button"
                      onClick={() => {
                        setConfirmPaintId(paint.id)
                        singleDialogRef.current?.showModal()
                      }}
                      className="btn-destructive btn-sm btn-outline"
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPaints.length === 0 && inputValue.trim() && (
        <p className="text-sm text-muted-foreground">
          No paints match &quot;{inputValue.trim()}&quot;.
        </p>
      )}

      {/* Single remove confirmation dialog */}
      <dialog
        ref={singleDialogRef}
        className="m-auto w-full max-w-md rounded-lg border border-border bg-background p-0 shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm">
            Remove <strong>{confirmPaint?.name}</strong> from this hue? The paint will be unassigned but not deleted.
          </p>
          {singleState?.error && (
            <p className="text-sm text-destructive">{singleState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                singleDialogRef.current?.close()
                setConfirmPaintId(null)
              }}
            >
              Cancel
            </Button>
            <form action={singleFormAction}>
              <input type="hidden" name="paint_id" value={confirmPaintId ?? ''} />
              <input type="hidden" name="hue_id" value={hueId} />
              <ConfirmRemoveButton />
            </form>
          </div>
        </div>
      </dialog>

      {/* Bulk remove confirmation dialog */}
      <dialog
        ref={bulkDialogRef}
        className="m-auto w-full max-w-md rounded-lg border border-border bg-background p-0 shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm">
            Remove{' '}
            <strong>
              {selectedIds.size} paint{selectedIds.size !== 1 ? 's' : ''}
            </strong>{' '}
            from this hue? They will be unassigned but not deleted.
          </p>
          {bulkState?.error && (
            <p className="text-sm text-destructive">{bulkState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => bulkDialogRef.current?.close()}
            >
              Cancel
            </Button>
            <form action={bulkFormAction}>
              <input type="hidden" name="paint_ids" value={Array.from(selectedIds).join(',')} />
              <input type="hidden" name="hue_id" value={hueId} />
              <ConfirmRemoveButton label="Remove Selected" />
            </form>
          </div>
        </div>
      </dialog>
    </div>
  )
}
