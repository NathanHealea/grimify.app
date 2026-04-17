'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

import { deleteUser } from '@/modules/user/actions/delete-user'

/**
 * Modal confirmation dialog for permanently deleting a user account.
 *
 * Built on the native `<dialog>` element (no extra primitive). Renders
 * nothing when `open` is false. Calling the {@link deleteUser} server
 * action on confirm — the action calls the `admin_delete_user` RPC which
 * removes the row from `auth.users` and cascades the profile.
 *
 * @param props.userId - UUID of the account to delete.
 * @param props.displayName - Name shown in the confirmation prompt.
 * @param props.open - Whether the dialog is visible.
 * @param props.onClose - Called when the dialog should close (cancel or success).
 */
export function DeleteUserDialog({
  userId,
  displayName,
  open,
  onClose,
}: {
  userId: string
  displayName: string
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.error) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      className="rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-black/40"
    >
      <div className="flex w-96 max-w-full flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Delete user?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete <span className="font-medium">{displayName}</span>
            . This removes their account, profile, and all related data. This
            action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="btn btn-sm btn-destructive"
          >
            {isPending ? 'Deleting...' : 'Delete user'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
