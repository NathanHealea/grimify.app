'use client'

import { useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { deletePaint } from '@/modules/admin/actions/paint-actions'
import type { PaintFormState } from '@/modules/admin/types/paint-form-state'

/**
 * Props for {@link DeletePaintButton}.
 */
type DeletePaintButtonProps = {
  /** The UUID of the paint to delete. */
  paintId: string
  /** The human-readable name of the paint, used in the confirmation dialog. */
  paintName: string
}

/**
 * Submit button inside the delete form that reflects pending state.
 */
function ConfirmDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-destructive btn-sm">
      {pending ? 'Deleting…' : 'Delete Paint'}
    </button>
  )
}

/**
 * Admin button that opens a native `<dialog>` confirmation before deleting a paint.
 *
 * On confirm, calls the {@link deletePaint} server action and redirects to `/admin/paints`.
 *
 * @param props - {@link DeletePaintButtonProps}
 */
export function DeletePaintButton({ paintId, paintName }: DeletePaintButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction] = useActionState(deletePaint, null as PaintFormState)

  return (
    <>
      <button
        type="button"
        className="btn btn-destructive btn-sm btn-outline"
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete
      </button>

      <dialog ref={dialogRef} className="m-auto rounded-lg border border-border bg-background p-0 shadow-lg backdrop:bg-black/50">
        <div className="p-6 flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Delete Paint</h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{paintName}</strong>? This action cannot
            be undone.
          </p>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>

            <form action={formAction}>
              <input type="hidden" name="id" value={paintId} />
              <ConfirmDeleteButton />
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
