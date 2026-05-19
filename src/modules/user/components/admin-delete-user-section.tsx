'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { DeleteUserDialog } from '@/modules/user/components/delete-user-dialog'

/**
 * Danger zone section on the admin edit page with a delete account button.
 *
 * Opens the {@link DeleteUserDialog} type-to-confirm dialog on click.
 * Navigates to `/admin/users` after a successful deletion.
 *
 * @param props.userId - UUID of the account to delete.
 * @param props.displayName - Display name shown in the confirmation dialog.
 */
export function AdminDeleteUserSection({
  userId,
  displayName,
}: {
  userId: string
  displayName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleClose() {
    setOpen(false)
  }

  function handleDeleted() {
    setOpen(false)
    router.push('/admin/users')
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-sm btn-destructive btn-outline"
      >
        Delete account
      </Button>

      <DeleteUserDialog
        userId={userId}
        displayName={displayName}
        open={open}
        onClose={handleClose}
        onDeleted={handleDeleted}
      />
    </>
  )
}
