'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateRole } from '@/modules/admin/actions/update-role'
import { validateRoleName } from '@/modules/admin/validation'

/**
 * Card displaying role info with an inline rename form for custom roles.
 *
 * Built-in roles display a read-only name with a "Built-in" badge.
 * Custom roles show an edit button that reveals a rename form using
 * `useActionState` to submit to the {@link updateRole} server action.
 * Validation errors and server errors are surfaced as Sonner toasts;
 * a success toast confirms the rename.
 *
 * @param props.role - The role to display.
 */
export function RoleDetailCard({
  role,
}: {
  role: { id: string; name: string; builtin: boolean }
}) {
  const [editing, setEditing] = useState(false)

  const [, formAction, isPending] = useActionState(
    async (_prev: Record<string, never>, formData: FormData) => {
      const newName = formData.get('name') as string

      const validationError = validateRoleName(newName)
      if (validationError) {
        toast.error(validationError)
        return {}
      }

      const result = await updateRole(role.id, newName)
      if (result.error) {
        toast.error(result.error)
        return {}
      }

      toast.success(`Renamed role to '${newName}'`)
      setEditing(false)
      return {}
    },
    {}
  )

  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        {editing ? (
          <form action={formAction} className="flex items-start gap-3">
            <div className="flex flex-col gap-1">
              <Input
                name="name"
                type="text"
                defaultValue={role.name}
                required
                minLength={2}
                maxLength={30}
                pattern="[a-z][a-z0-9-]*"
                className="input-sm w-60"
                disabled={isPending}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="btn-sm btn-primary"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="btn-sm btn-ghost"
            >
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{role.name}</h2>
            {role.builtin ? (
              <span className="badge badge-soft">Built-in</span>
            ) : (
              <Button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-sm btn-ghost"
              >
                Rename
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
