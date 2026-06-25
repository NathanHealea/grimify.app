'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteOwnAccount } from '@/modules/user/actions/delete-own-account'

/**
 * Props for {@link DeleteAccountDialog}.
 */
type DeleteAccountDialogProps = {
  /** The user's display name — must be typed exactly to unlock the confirm button. */
  displayName: string
  /** Whether the dialog is currently open. */
  open: boolean
  /** Called when the dialog should close (cancel or backdrop click). */
  onClose: () => void
}

/**
 * Confirmation dialog for permanent self-service account deletion.
 *
 * Requires the user to type their display name exactly before the button activates.
 * On confirm, calls {@link deleteOwnAccount} which deletes the account server-side,
 * signs out, and redirects to `/`.
 *
 * @param props - See {@link DeleteAccountDialogProps}.
 */
export function DeleteAccountDialog({
  displayName,
  open,
  onClose,
}: DeleteAccountDialogProps) {
  const [confirmValue, setConfirmValue] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setConfirmValue('')
    setError('')
    onClose()
  }

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      const result = await deleteOwnAccount()
      if (result?.error) {
        setError(result.error)
      }
      // On success, deleteOwnAccount redirects — no cleanup needed.
    })
  }

  const canConfirm = confirmValue === displayName && !isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full max-w-sm p-6">
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            This action is permanent and cannot be undone. Your account, profile,
            and all associated data will be deleted.
          </p>
        </DialogHeader>

        <div className="form-item mt-2">
          <label className="form-label text-sm" htmlFor="confirm-account-name">
            Type <span className="font-medium">{displayName}</span> to confirm
          </label>
          <Input
            id="confirm-account-name"
            type="text"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            className="input-sm w-full"
            placeholder={displayName}
            autoComplete="off"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="btn-sm btn-ghost"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="btn-sm btn-destructive"
          >
            {isPending ? 'Deleting…' : 'Delete My Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
