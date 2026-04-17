'use client'

import Image from 'next/image'
import { AdminUserActionsMenu } from '@/modules/user/components/admin-user-actions-menu'
import type { UserWithRoles } from '@/modules/user/types/user-with-roles'

/**
 * Client component that renders a table of all users with per-row action controls.
 *
 * Displays each user's avatar, display name, and role badges. Each row has an
 * actions dropdown (View / Edit / Delete) except the current admin's own row,
 * which shows no menu to prevent self-modification.
 *
 * @param props.users - All user profiles with their assigned role names.
 * @param props.currentUserId - The authenticated admin's UUID, used to disable self-modification.
 */
export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: UserWithRoles[]
  currentUserId: string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roles</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === currentUserId}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserRow({ user, isSelf }: { user: UserWithRoles; isSelf: boolean }) {
  const initials = (user.display_name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

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
            {isSelf && (
              <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
            )}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          {user.roles.map((role) => (
            <span
              key={role}
              className={
                role === 'admin'
                  ? 'badge badge-primary'
                  : 'badge badge-soft'
              }
            >
              {role}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">
            Cannot modify own account
          </span>
        ) : (
          <AdminUserActionsMenu
            userId={user.id}
            displayName={user.display_name ?? 'this user'}
          />
        )}
      </td>
    </tr>
  )
}
