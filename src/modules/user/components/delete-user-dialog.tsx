'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

import { deleteUser } from '@/modules/user/actions/delete-user'

/**
 * Modal confirmation dialog for permanently deleting a user account.
 *
 * Built on the native `<dialog>` element (no extra primitive). Requires
 * the admin to type the user's display name before the delete button becomes
 * active, preventing accidental deletions. Calls the {@link deleteUser}
 * server action on confirm — which calls `admin_delete_user` RPC, removing
 * the row from `auth.users` and cascading to `profiles` and `user_roles`.
 *
 * @param props.userId - UUID of the account to delete.
 * @param props.displayName - Name shown in the confirmation prompt and required for type-to-confirm.
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
  const [confirmValue, setConfirmValue] = useState('')

  // Open/close the native dialog element
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Reset state on close so the dialog is clean the next time it opens
  function handleClose() {
    setConfirmValue('')
    setError(null)
    onClose()
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.error) {
        setError(result.error)
        return
      }
      handleClose()
    })
  }

  const canConfirm = confirmValue === displayName && !isPending

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onCancel={handleClose}
      className="rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-black/40"
    >
      <div className="flex w-96 max-w-full flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Delete user?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete{' '}
            <span className="font-medium">{displayName}</span>. This removes
            their account, profile, and all related data. This action cannot be
            undone.
          </p>
        </div>

        <div className="form-item">
          <label className="form-label text-sm" htmlFor="confirm-name">
            Type <span className="font-medium">{displayName}</span> to confirm
          </label>
          <input
            id="confirm-name"
            type="text"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            className="input input-sm w-full"
            placeholder={displayName}
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="btn btn-sm btn-destructive"
          >
            {isPending ? 'Deleting...' : 'Delete user'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
