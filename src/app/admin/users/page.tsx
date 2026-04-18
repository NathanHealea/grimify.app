import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { AdminUsersTable } from '@/modules/user/components/admin-users-table'
import { UserSearch } from '@/modules/user/components/user-search'
import { UserRoleFilter } from '@/modules/user/components/user-role-filter'
import { listRoles } from '@/modules/admin/services/role-service'
import { listProfiles } from '@/modules/user/services/profile-service'

/** Number of users shown per page. */
const PAGE_SIZE = 20

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>
}) {
  const { q, role, page } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware guarantees an authenticated admin, but guard defensively
  if (!user) {
    return null
  }

  // Resolve current page (1-based)
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  // Fetch roles for the filter dropdown
  const roles = await listRoles()

  // Resolve role filter: find role ID from name
  const roleId = role ? (roles.find((r) => r.name === role)?.id ?? null) : null

  const { users, count } = await listProfiles({ q, roleId, offset, limit: PAGE_SIZE })

  const totalPages = Math.ceil(count / PAGE_SIZE)

  // Build pagination URL helper
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (role) params.set('role', role)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/admin/users${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts. Search, filter, view details, deactivate, or delete.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <UserSearch initialValue={q ?? ''} />

        <UserRoleFilter roles={roles} initialValue={role ?? ''} />

        {(q || role) && (
          <Link href="/admin/users" className="btn btn-ghost btn-sm">
            Clear filters
          </Link>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {count} user{count !== 1 ? 's' : ''}
        </span>
      </div>

      <AdminUsersTable
        users={users}
        currentUserId={user.id}
        currentPage={currentPage}
        totalPages={totalPages}
        searchParams={{ q, role }}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {currentPage > 1 ? (
            <Link href={pageUrl(currentPage - 1)} className="btn btn-ghost btn-sm">
              ← Prev
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm btn-disabled opacity-50">← Prev</span>
          )}

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link href={pageUrl(currentPage + 1)} className="btn btn-ghost btn-sm">
              Next →
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm btn-disabled opacity-50">Next →</span>
          )}
        </div>
      )}
    </div>
  )
}
