'use client'

import { useActionState } from 'react'

import { assignRole } from '@/modules/admin/actions/assign-role'

/** A user available for role assignment. */
type AssignableUser = {
  id: string
  display_name: string | null
}

/**
 * Form to assign a role to a user via a dropdown selector.
 *
 * Renders a `<select>` populated with users not already assigned to
 * the role. Submits to the {@link assignRole} server action.
 *
 * @param props.roleId - UUID of the role to assign.
 * @param props.availableUsers - Users not already assigned to this role.
 */
export function AssignRoleForm({
  roleId,
  availableUsers,
}: {
  roleId: string
  availableUsers: AssignableUser[]
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const userId = formData.get('userId') as string
      if (!userId) {
        return { error: 'Please select a user.' }
      }
      return assignRole(userId, roleId)
    },
    {}
  )

  if (availableUsers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All users already have this role.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex items-start gap-3">
      <div className="flex flex-col gap-1">
        <select
          name="userId"
          required
          className="select select-sm w-60"
          disabled={isPending}
          defaultValue=""
        >
          <option value="" disabled>
            Select a user...
          </option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name ?? 'Unnamed user'}
            </option>
          ))}
        </select>
        {state.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-sm btn-primary"
      >
        {isPending ? 'Assigning...' : 'Assign'}
      </button>
    </form>
  )
}
