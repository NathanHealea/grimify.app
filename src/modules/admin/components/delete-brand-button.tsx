'use client'

import { useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { deleteBrand } from '@/modules/admin/actions/brand-actions'
import type { BrandFormState } from '@/modules/admin/types/brand-form-state'

/**
 * Props for {@link DeleteBrandButton}.
 */
type DeleteBrandButtonProps = {
  /** The numeric database ID of the brand to delete. */
  brandId: number
  /** The human-readable name of the brand, used in the confirmation dialog. */
  brandName: string
}

/**
 * Submit button inside the delete form that reflects pending state.
 */
function ConfirmDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-destructive btn-sm">
      {pending ? 'Deleting…' : 'Delete Brand'}
    </button>
  )
}

/**
 * Admin button that opens a native `<dialog>` confirmation before deleting a brand.
 *
 * Warns the user that deleting the brand will cascade and remove all its
 * product lines and associated paints. On confirm, calls the {@link deleteBrand}
 * server action.
 *
 * @param props - {@link DeleteBrandButtonProps}
 */
export function DeleteBrandButton({ brandId, brandName }: DeleteBrandButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction] = useActionState(
    deleteBrand,
    null as BrandFormState
  )

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
          <h3 className="text-lg font-semibold">Delete Brand</h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{brandName}</strong>? This will permanently
            remove the brand along with all its product lines and paints. This action cannot
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
              <input type="hidden" name="id" value={brandId} />
              <ConfirmDeleteButton />
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
