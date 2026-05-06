'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { deactivateUser } from '@/modules/user/actions/deactivate-user'

/**
 * Toggle button that bans or unbans a user account.
 *
 * Shows "Deactivate" when the user is active and "Reactivate" when banned.
 * Calls the {@link deactivateUser} server action and surfaces success and
 * failure as Sonner toasts.
 *
 * @param props.userId - UUID of the account to ban or unban.
 * @param props.isBanned - Whether the user is currently banned.
 * @param props.displayName - Display name of the user, used in the success toast message.
 */
export function DeactivateUserButton({
  userId,
  isBanned,
  displayName,
}: {
  userId: string
  isBanned: boolean
  displayName: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await deactivateUser(userId, !isBanned)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        isBanned
          ? `Reactivated '${displayName}'`
          : `Deactivated '${displayName}'`
      )
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        isBanned
          ? 'btn btn-sm btn-primary'
          : 'btn btn-sm btn-destructive btn-outline'
      }
    >
      {isPending
        ? isBanned
          ? 'Reactivating…'
          : 'Deactivating…'
        : isBanned
          ? 'Reactivate account'
          : 'Deactivate account'}
    </button>
  )
}
