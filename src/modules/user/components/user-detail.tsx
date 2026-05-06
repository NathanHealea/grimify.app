'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeactivateUserButton } from '@/modules/user/components/deactivate-user-button'
import { DeleteUserDialog } from '@/modules/user/components/delete-user-dialog'

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
 * Serializable auth metadata extracted from the Supabase Admin API user record.
 *
 * Only the fields rendered in the UI are included. `null` when the Admin API
 * is unavailable or the user cannot be found.
 */
export type AuthInfo = {
  /** Auth email (may differ from `profiles.email` during a change). */
  email: string | null
  /** OAuth provider names (e.g. `['google', 'discord']`). */
  providers: string[]
  /** ISO-8601 timestamp of the user's last sign-in, or `null`. */
  lastSignInAt: string | null
  /** ISO-8601 timestamp until which the user is banned, or `null`. */
  bannedUntil: string | null
} | null

/**
 * Admin user detail view with profile, roles, auth info, and account actions.
 *
 * Renders four sections: Profile info, assigned roles, auth provider details,
 * and destructive account actions (deactivate / delete). Hides destructive
 * actions if the current admin is viewing their own account or the owner account.
 *
 * @param props.profile - The target user's profile row.
 * @param props.roles - Roles assigned to this user.
 * @param props.authInfo - Extracted auth metadata from the Admin API (may be null).
 * @param props.currentUserId - The authenticated admin's UUID (for self-protection).
 */
export function UserDetail({
  profile,
  roles,
  authInfo,
  currentUserId,
}: {
  profile: Profile
  roles: Role[]
  authInfo: AuthInfo
  currentUserId: string
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isSelf = profile.id === currentUserId
  const isOwner = roles.some((r) => r.name === 'owner')

  const isBanned =
    authInfo?.bannedUntil != null && new Date(authInfo.bannedUntil) > new Date()

  const providers = authInfo?.providers ?? []

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
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
        </CardContent>
      </Card>

      {/* Roles section */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Roles currently assigned to this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Auth info section */}
      <Card>
        <CardHeader>
          <CardTitle>Auth Info</CardTitle>
          <CardDescription>
            Authentication provider and sign-in history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Email" value={authInfo?.email ?? '—'} />
          <Row
            label="Provider(s)"
            value={providers.length > 0 ? providers.join(', ') : '—'}
          />
          <Row
            label="Last sign-in"
            value={
              authInfo?.lastSignInAt
                ? new Date(authInfo.lastSignInAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '—'
            }
          />
          {isBanned && authInfo?.bannedUntil && (
            <Row
              label="Banned until"
              value={new Date(authInfo.bannedUntil).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
          )}
        </CardContent>
      </Card>

      {/* Actions section — hidden for own account or owner account */}
      {!isSelf && !isOwner && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              These actions are irreversible or impactful. Proceed with care.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <DeactivateUserButton
              userId={profile.id}
              isBanned={isBanned}
              displayName={profile.display_name ?? 'this user'}
            />

            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="btn btn-sm btn-destructive btn-outline"
            >
              Delete account
            </button>
          </CardContent>
        </Card>
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
