'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'

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
 * the role. Submits to the {@link assignRole} server action. Validation
 * and server errors are surfaced as Sonner toasts; a success toast
 * confirms the assignment using the selected user's display name.
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
  const [, formAction, isPending] = useActionState(
    async (_prev: Record<string, never>, formData: FormData) => {
      const userId = formData.get('userId') as string
      if (!userId) {
        toast.error('Please select a user.')
        return {}
      }

      const user = availableUsers.find((u) => u.id === userId)
      const result = await assignRole(userId, roleId)
      if (result.error) {
        toast.error(result.error)
        return {}
      }

      toast.success(`Assigned role to '${user?.display_name ?? 'user'}'`)
      return {}
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
