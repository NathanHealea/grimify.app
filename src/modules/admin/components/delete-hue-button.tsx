'use client'

import { useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { deleteHue } from '@/modules/admin/actions/hue-actions'
import type { HueFormState } from '@/modules/admin/types/hue-form-state'

/**
 * Props for {@link DeleteHueButton}.
 */
type DeleteHueButtonProps = {
  /** The UUID of the hue to delete. */
  hueId: string
  /** The human-readable name of the hue, used in the confirmation dialog. */
  hueName: string
  /** Number of child hues that will be deleted (for parent hues). */
  childCount?: number
  /** Number of paints associated with this hue that will lose their assignment. */
  paintCount?: number
}

/**
 * Submit button inside the delete form that reflects pending state.
 */
function ConfirmDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-destructive btn-sm">
      {pending ? 'Deleting…' : 'Delete Hue'}
    </button>
  )
}

/**
 * Admin button that opens a native `<dialog>` confirmation before deleting a hue.
 *
 * Warns the user about cascading impact: child hues and associated paint
 * assignments will be removed. On confirm, calls the {@link deleteHue} action.
 *
 * @param props - {@link DeleteHueButtonProps}
 */
export function DeleteHueButton({ hueId, hueName, childCount, paintCount }: DeleteHueButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction] = useActionState(deleteHue, null as HueFormState)

  const hasCascade = (childCount ?? 0) > 0 || (paintCount ?? 0) > 0

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
          <h3 className="text-lg font-semibold">Delete Hue</h3>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{hueName}</strong>?
          </p>

          {hasCascade && (
            <ul className="text-sm text-destructive list-disc list-inside space-y-1">
              {(childCount ?? 0) > 0 && (
                <li>
                  {childCount} child {childCount === 1 ? 'hue' : 'hues'} will also be deleted.
                </li>
              )}
              {(paintCount ?? 0) > 0 && (
                <li>
                  {paintCount} {paintCount === 1 ? 'paint' : 'paints'} will lose their hue
                  assignment.
                </li>
              )}
            </ul>
          )}

          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>

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
              <input type="hidden" name="id" value={hueId} />
              <ConfirmDeleteButton />
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
