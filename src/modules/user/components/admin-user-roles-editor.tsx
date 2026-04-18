'use client'

import { useState, useTransition } from 'react'

import { assignRole } from '@/modules/admin/actions/assign-role'
import { revokeRole } from '@/modules/admin/actions/revoke-role'

type Role = { id: string; name: string }

/**
 * Inline role management panel for the admin user edit page.
 *
 * Displays the user's currently assigned roles as removable badges, and a
 * dropdown to assign new roles. Each action fires immediately via the existing
 * {@link assignRole} and {@link revokeRole} server actions — no profile save
 * is required. Local state is updated optimistically on success.
 *
 * The `user` baseline role is shown but cannot be revoked. Owner-assigned
 * users should not reach this component (the edit page guards them upstream).
 *
 * @param props.userId - UUID of the user being edited.
 * @param props.initialAssigned - Roles currently assigned to the user.
 * @param props.allRoles - All roles in the system (for the assign dropdown).
 */
export function AdminUserRolesEditor({
  userId,
  initialAssigned,
  allRoles,
}: {
  userId: string
  initialAssigned: Role[]
  allRoles: Role[]
}) {
  const [assigned, setAssigned] = useState<Role[]>(initialAssigned)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const unassigned = allRoles.filter(
    (r) => !assigned.some((a) => a.id === r.id)
  )

  function handleAssign() {
    if (!selectedRoleId) return
    const role = allRoles.find((r) => r.id === selectedRoleId)
    if (!role) return

    setError(null)
    startTransition(async () => {
      const result = await assignRole(userId, selectedRoleId)
      if (result.error) {
        setError(result.error)
      } else {
        setAssigned((prev) => [...prev, role])
        setSelectedRoleId('')
      }
    })
  }

  function handleRevoke(roleId: string) {
    setError(null)
    startTransition(async () => {
      const result = await revokeRole(userId, roleId)
      if (result.error) {
        setError(result.error)
      } else {
        setAssigned((prev) => prev.filter((r) => r.id !== roleId))
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Current roles */}
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles assigned.</p>
        ) : (
          assigned.map((role) => {
            const isBase = role.name === 'user'
            return (
              <span
                key={role.id}
                className={`inline-flex items-center gap-1.5 ${
                  role.name === 'owner'
                    ? 'badge badge-accent'
                    : role.name === 'admin'
                      ? 'badge badge-primary'
                      : 'badge badge-soft'
                }`}
              >
                {role.name}
                {!isBase && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(role.id)}
                    disabled={isPending}
                    aria-label={`Remove ${role.name} role`}
                    className="ml-0.5 rounded-full opacity-60 hover:opacity-100 disabled:opacity-30"
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })
        )}
      </div>

      {/* Assign new role */}
      {unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={isPending}
            className="input input-sm"
            aria-label="Select role to assign"
          >
            <option value="">Add a role…</option>
            {unassigned.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedRoleId || isPending}
            className="btn btn-sm btn-primary"
          >
            {isPending ? 'Saving…' : 'Add'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
