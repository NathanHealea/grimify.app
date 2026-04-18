'use client'

import { useState, useTransition } from 'react'

import { deactivateUser } from '@/modules/user/actions/deactivate-user'

/**
 * Toggle button that bans or unbans a user account.
 *
 * Shows "Deactivate" when the user is active and "Reactivate" when banned.
 * Calls the {@link deactivateUser} server action and shows an inline error
 * on failure.
 *
 * @param props.userId - UUID of the account to ban or unban.
 * @param props.isBanned - Whether the user is currently banned.
 */
export function DeactivateUserButton({
  userId,
  isBanned,
}: {
  userId: string
  isBanned: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await deactivateUser(userId, !isBanned)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
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
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
