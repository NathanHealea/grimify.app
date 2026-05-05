'use client'

import { useState, useTransition } from 'react'

import { deleteUser } from '@/modules/user/actions/delete-user'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Modal confirmation dialog for permanently deleting a user account.
 *
 * Requires the admin to type the user's display name before the delete button
 * becomes active, preventing accidental deletions. Calls the {@link deleteUser}
 * server action on confirm — which calls `admin_delete_user` RPC, removing
 * the row from `auth.users` and cascading to `profiles` and `user_roles`.
 *
 * @param props.userId - UUID of the account to delete.
 * @param props.displayName - Name shown in the confirmation prompt and required for type-to-confirm.
 * @param props.open - Whether the dialog is visible.
 * @param props.onClose - Called when the dialog closes via cancel or native dismiss.
 * @param props.onDeleted - Optional callback called after a successful deletion (before `onClose`).
 *   Use this to navigate away from the deleted user's page.
 */
export function DeleteUserDialog({
  userId,
  displayName,
  open,
  onClose,
  onDeleted,
}: {
  userId: string
  displayName: string
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmValue, setConfirmValue] = useState('')

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
      onDeleted?.()
      handleClose()
    })
  }

  const canConfirm = confirmValue === displayName && !isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full max-w-sm p-6">
        <DialogHeader>
          <DialogTitle>Delete user?</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete{' '}
            <span className="font-medium">{displayName}</span>. This removes
            their account, profile, and all related data. This action cannot be
            undone.
          </p>
        </DialogHeader>

        <div className="form-item mt-2">
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

        <DialogFooter className="mt-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
