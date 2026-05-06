'use client'

import Image from 'next/image'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { revokeRole } from '@/modules/admin/actions/revoke-role'

/** Shape of a user row in the role users table. */
type RoleUser = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

/**
 * Client component that renders a table of users assigned to a role.
 *
 * Each row has a "Revoke" button to remove the role from the user.
 * The revoke button is disabled for the `user` role (baseline protection).
 * Follows the same table pattern as `admin-users-table.tsx`.
 *
 * @param props.roleId - UUID of the role.
 * @param props.roleName - Name of the role (used to disable revoke for `user`).
 * @param props.users - Array of users assigned to this role.
 */
export function RoleUsersTable({
  roleId,
  roleName,
  users,
}: {
  roleId: string
  roleName: string
  users: RoleUser[]
}) {
  const isUserRole = roleName === 'user'

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No users assigned to this role.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              User
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              roleId={roleId}
              isUserRole={isUserRole}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserRow({
  user,
  roleId,
  isUserRole,
}: {
  user: RoleUser
  roleId: string
  isUserRole: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const initials = (user.display_name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeRole(user.id, roleId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Revoked role from '${user.display_name ?? 'user'}'`)
    })
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.display_name ?? 'User'}
              width={32}
              height={32}
              className="size-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="avatar avatar-sm avatar-placeholder">
              {initials}
            </span>
          )}
          <span className="font-medium">
            {user.display_name ?? 'No display name'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {isUserRole ? (
            <span className="text-xs text-muted-foreground">
              Cannot revoke baseline role
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={isPending}
              className="btn btn-sm btn-destructive"
            >
              {isPending ? 'Revoking...' : 'Revoke'}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
