'use client'

import { useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  /** Additional classes applied to the trigger button. Defaults to `btn-destructive btn-sm btn-outline`. */
  triggerClassName?: string
}

/**
 * Submit button inside the delete form that reflects pending state.
 */
function ConfirmDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-destructive btn-sm">
      {pending ? 'Deleting…' : 'Delete Product Line'}
    </Button>
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
  triggerClassName,
}: DeleteProductLineButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction] = useActionState(
    deleteProductLine,
    null as ProductLineFormState
  )

  return (
    <>
      <Button
        type="button"
        className={cn('btn-destructive btn-sm', triggerClassName === undefined && 'btn-outline', triggerClassName)}
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete
      </Button>

      <dialog ref={dialogRef} className="m-auto w-full max-w-md rounded-lg border border-border bg-background p-0 shadow-lg backdrop:bg-black/50">
        <div className="p-6 flex flex-col gap-4">
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
            <Button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </Button>

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
