'use client'

import { useActionState } from 'react'

import { createRole } from '@/modules/admin/actions/create-role'
import { validateRoleName } from '@/modules/admin/validation'

/**
 * Inline form for creating a new custom role.
 *
 * Validates the role name client-side before submitting to the
 * {@link createRole} server action. Displays error messages inline.
 */
export function CreateRoleForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const name = formData.get('name') as string

      const validationError = validateRoleName(name)
      if (validationError) {
        return { error: validationError }
      }

      return createRole(name)
    },
    {}
  )

  return (
    <form action={formAction} className="flex items-start gap-3">
      <div className="flex flex-col gap-1">
        <input
          name="name"
          type="text"
          placeholder="new-role-name"
          required
          minLength={2}
          maxLength={30}
          pattern="[a-z][a-z0-9-]*"
          className="input input-sm w-60"
          disabled={isPending}
        />
        {state.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-sm btn-primary"
      >
        {isPending ? 'Creating...' : 'Create role'}
      </button>
    </form>
  )
}
