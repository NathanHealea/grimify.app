'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteRole } from '@/modules/admin/actions/delete-role'

/** Shape of a role row in the role list table. */
type RoleRow = {
  id: string
  name: string
  builtin: boolean
  userCount: number
}

/**
 * Client component that renders a table of all roles with delete actions.
 *
 * Built-in roles and roles with assigned users cannot be deleted.
 * Delete uses `useTransition` with inline confirmation following
 * the existing admin table patterns.
 *
 * @param props.roles - Array of role rows with user counts.
 */
export function RoleListTable({ roles }: { roles: RoleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Users
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <RoleRow key={role.id} role={role} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RoleRow({ role }: { role: RoleRow }) {
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  const canDelete = !role.builtin && role.userCount === 0

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    startTransition(async () => {
      const result = await deleteRole(role.id)
      if (result.error) {
        toast.error(result.error)
        setConfirming(false)
        return
      }
      toast.success(`Deleted role '${role.name}'`)
    })
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <span className="font-medium">{role.name}</span>
      </td>
      <td className="px-4 py-3">
        {role.builtin ? (
          <span className="badge badge-soft">Built-in</span>
        ) : (
          <span className="badge badge-ghost">Custom</span>
        )}
      </td>
      <td className="px-4 py-3">{role.userCount}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/roles/${role.id}`}
            className="btn btn-sm btn-ghost"
          >
            View
          </Link>
          {canDelete && (
            <>
              {confirming && !isPending && (
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="btn btn-sm btn-ghost"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="btn btn-sm btn-destructive"
              >
                {isPending
                  ? 'Deleting...'
                  : confirming
                    ? 'Confirm'
                    : 'Delete'}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
