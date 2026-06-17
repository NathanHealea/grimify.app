'use client'

import { useRef, useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { cn } from '@/lib/utils'
import { deleteHue } from '@/modules/admin/actions/hue-actions'
import type { HueFormState } from '@/modules/admin/types/hue-form-state'
import { Button } from '@/components/ui/button'

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
  /**
   * Additional classes applied to the trigger button. When provided, `btn-sm`
   * is also added automatically. Pass `""` for a solid destructive button (no
   * outline), or `"btn-outline"` for an outline variant. Omit for the default
   * full-size `btn-destructive` used in danger-zone contexts.
   */
  triggerClassName?: string
  /**
   * Path to redirect to after a successful deletion. Defaults to `/admin/hues`
   * (the hue list). Override when deleting a child hue from a parent's detail
   * page so the user stays on the parent page instead.
   */
  redirectTo?: string
}

/**
 * Submit button inside the delete form that reflects pending state.
 */
function ConfirmDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-destructive btn-sm">
      {pending ? 'Deleting…' : 'Delete Hue'}
    </Button>
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
export function DeleteHueButton({ hueId, hueName, childCount, paintCount, triggerClassName, redirectTo }: DeleteHueButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction] = useActionState(deleteHue, null as HueFormState)

  const hasCascade = (childCount ?? 0) > 0 || (paintCount ?? 0) > 0

  return (
    <>
      <Button
        type="button"
        className={cn('btn-destructive', triggerClassName !== undefined && 'btn-sm', triggerClassName)}
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete
      </Button>

      <dialog ref={dialogRef} className="m-auto w-full max-w-md rounded-lg border border-border bg-background p-0 shadow-lg backdrop:bg-black/50">
        <div className="p-6 flex flex-col gap-4">
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
            <Button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </Button>

            <form action={formAction}>
              <input type="hidden" name="id" value={hueId} />
              {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
              <ConfirmDeleteButton />
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
