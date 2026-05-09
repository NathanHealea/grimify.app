'use client'

import { useRouter } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL_ROLES_VALUE = '__all__'

/**
 * Role filter dropdown that syncs the selected role to the `?role=` URL param.
 *
 * Preserves the existing `?q=` (search) param and resets `?page=` to 1
 * when the filter changes.
 *
 * @param props.roles - Available role options.
 * @param props.initialValue - Current role filter from the URL (`?role=`).
 */
export function UserRoleFilter({
  roles,
  initialValue,
}: {
  roles: { id: string; name: string }[]
  initialValue: string
}) {
  const router = useRouter()

  function handleChange(value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value && value !== ALL_ROLES_VALUE) {
      params.set('role', value)
    } else {
      params.delete('role')
    }
    params.delete('page')
    router.replace(`?${params.toString()}`)
  }

  const currentLabel = initialValue || 'All roles'

  return (
    <Select
      defaultValue={initialValue || ALL_ROLES_VALUE}
      onValueChange={handleChange}
    >
      <SelectTrigger aria-label="Filter by role">
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ROLES_VALUE}>All roles</SelectItem>
        {roles.map((r) => (
          <SelectItem key={r.id} value={r.name}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
