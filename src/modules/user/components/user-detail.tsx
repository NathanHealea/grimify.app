'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

import { DeactivateUserButton } from '@/modules/user/components/deactivate-user-button'
import { DeleteUserDialog } from '@/modules/user/components/delete-user-dialog'
import { useState } from 'react'

type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  email: string | null
  has_setup_profile: boolean
  created_at: string
  updated_at: string
}

type Role = {
  id: string
  name: string
}

/**
 * Admin user detail view with profile, roles, auth info, and account actions.
 *
 * Renders four sections: Profile info, assigned roles, auth provider details,
 * and destructive account actions (deactivate / delete). Hides destructive
 * actions if the current admin is viewing their own account or the owner account.
 *
 * @param props.profile - The target user's profile row.
 * @param props.roles - Roles assigned to this user.
 * @param props.authUser - Supabase auth user from the Admin API (may be null on error).
 * @param props.currentUserId - The authenticated admin's UUID (for self-protection).
 */
export function UserDetail({
  profile,
  roles,
  authUser,
  currentUserId,
}: {
  profile: Profile
  roles: Role[]
  authUser: User | null
  currentUserId: string
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isSelf = profile.id === currentUserId
  const isOwner = roles.some((r) => r.name === 'owner')

  const isBanned =
    authUser?.banned_until != null &&
    new Date(authUser.banned_until) > new Date()

  const providers =
    authUser?.identities?.map((identity) => identity.provider) ?? []

  const initials = (profile.display_name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name ?? 'User'}
            width={64}
            height={64}
            className="size-16 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="avatar avatar-placeholder" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
            {initials}
          </span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {profile.display_name ?? 'No display name'}
            </h1>
            {isSelf && (
              <span className="badge badge-soft text-xs">you</span>
            )}
            {isOwner && (
              <span className="badge badge-accent text-xs">owner</span>
            )}
            {isBanned && (
              <span className="badge badge-destructive text-xs">Banned</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{profile.email ?? 'No email'}</p>
        </div>
      </div>

      {/* Profile section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold">Profile</h2>
        </div>
        <div className="card-body space-y-3 text-sm">
          <Row label="Display name" value={profile.display_name ?? '—'} />
          <Row label="Bio" value={profile.bio ?? '—'} />
          <Row
            label="Setup complete"
            value={profile.has_setup_profile ? 'Yes' : 'No'}
          />
          <Row
            label="Created"
            value={new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          />
          <Row
            label="Last updated"
            value={new Date(profile.updated_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          />
        </div>
      </div>

      {/* Roles section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold">Roles</h2>
        </div>
        <div className="card-body">
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Link
                  key={role.id}
                  href={`/admin/roles/${role.id}`}
                  className={
                    role.name === 'owner'
                      ? 'badge badge-accent'
                      : role.name === 'admin'
                        ? 'badge badge-primary'
                        : 'badge badge-soft'
                  }
                >
                  {role.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auth info section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold">Auth Info</h2>
        </div>
        <div className="card-body space-y-3 text-sm">
          <Row label="Email" value={authUser?.email ?? '—'} />
          <Row
            label="Provider(s)"
            value={providers.length > 0 ? providers.join(', ') : '—'}
          />
          <Row
            label="Last sign-in"
            value={
              authUser?.last_sign_in_at
                ? new Date(authUser.last_sign_in_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '—'
            }
          />
          {isBanned && authUser?.banned_until && (
            <Row
              label="Banned until"
              value={new Date(authUser.banned_until).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
          )}
        </div>
      </div>

      {/* Actions section — hidden for own account or owner account */}
      {!isSelf && !isOwner && (
        <div className="card border-destructive/20">
          <div className="card-header">
            <h2 className="text-base font-semibold">Account Actions</h2>
            <p className="text-xs text-muted-foreground">
              These actions are irreversible or impactful. Proceed with care.
            </p>
          </div>
          <div className="card-body flex flex-wrap gap-3">
            <DeactivateUserButton userId={profile.id} isBanned={isBanned} />

            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="btn btn-sm btn-destructive btn-outline"
            >
              Delete account
            </button>
          </div>
        </div>
      )}

      <DeleteUserDialog
        userId={profile.id}
        displayName={profile.display_name ?? 'this user'}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  )
}

/** Simple label/value row for detail sections. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 break-all">{value}</span>
    </div>
  )
}
