'use client'

import { useRouter } from 'next/navigation'

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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(window.location.search)
    if (e.target.value) {
      params.set('role', e.target.value)
    } else {
      params.delete('role')
    }
    params.delete('page')
    router.replace(`?${params.toString()}`)
  }

  return (
    <select
      defaultValue={initialValue}
      onChange={handleChange}
      className="input input-sm"
      aria-label="Filter by role"
    >
      <option value="">All roles</option>
      {roles.map((r) => (
        <option key={r.id} value={r.name}>
          {r.name}
        </option>
      ))}
    </select>
  )
}
