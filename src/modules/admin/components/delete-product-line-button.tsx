'use client'

import { useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { deleteProductLine } from '@/modules/admin/actions/product-line-actions'
import type { ProductLineFormState } from '@/modules/admin/types/product-line-form-state'

/**
 * Props for {@link DeleteProductLineButton}.
 */
type DeleteProductLineButtonProps = {
  /** The numeric database ID of the product line to delete. */
  productLineId: number
  /** The human-readable name of the product line, used in the confirmation dialog. */
  productLineName: string
  /** The brand ID used to revalidate the brand detail page after deletion. */
  brandId: number
}

/**
 * Submit button inside the delete form that reflects pending state.
 */
function ConfirmDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-destructive btn-sm">
      {pending ? 'Deleting…' : 'Delete Product Line'}
    </button>
  )
}

/**
 * Admin button that opens a native `<dialog>` confirmation before deleting a product line.
 *
 * On confirm, calls the {@link deleteProductLine} server action which cascades
 * to remove associated paints.
 *
 * @param props - {@link DeleteProductLineButtonProps}
 */
export function DeleteProductLineButton({
  productLineId,
  productLineName,
  brandId,
}: DeleteProductLineButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction] = useActionState(
    deleteProductLine,
    null as ProductLineFormState
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

      <dialog ref={dialogRef} className="dialog">
        <div className="dialog-box flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Delete Product Line</h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{productLineName}</strong>? This will
            permanently remove the product line and all its associated paints.
            This action cannot be undone.
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
              <input type="hidden" name="id" value={productLineId} />
              <input type="hidden" name="brand_id" value={brandId} />
              <ConfirmDeleteButton />
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
