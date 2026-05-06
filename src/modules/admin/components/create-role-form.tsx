'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'

import { createRole } from '@/modules/admin/actions/create-role'
import { validateRoleName } from '@/modules/admin/validation'

/**
 * Inline form for creating a new custom role.
 *
 * Validates the role name client-side before submitting to the
 * {@link createRole} server action. Validation and server errors are
 * surfaced as Sonner toasts; a success toast confirms creation.
 */
export function CreateRoleForm() {
  const [, formAction, isPending] = useActionState(
    async (_prev: Record<string, never>, formData: FormData) => {
      const name = formData.get('name') as string

      const validationError = validateRoleName(name)
      if (validationError) {
        toast.error(validationError)
        return {}
      }

      const result = await createRole(name)
      if (result.error) {
        toast.error(result.error)
        return {}
      }

      toast.success(`Created role '${name}'`)
      return {}
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
