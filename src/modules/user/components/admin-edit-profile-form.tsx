'use client'

import { useActionState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  updateProfileAsAdmin,
  type AdminEditProfileState,
} from '@/modules/user/actions/update-profile-as-admin'

/**
 * Admin-facing edit form for another user's profile.
 *
 * Bound to the {@link updateProfileAsAdmin} server action via `useActionState`.
 * Edits `display_name` and `bio`; avatar is managed by the OAuth sync trigger.
 *
 * @param props.userId - UUID of the profile being edited.
 * @param props.initialDisplayName - Current display name, or null if unset.
 * @param props.initialBio - Current bio, or null if unset.
 */
export function AdminEditProfileForm({
  userId,
  initialDisplayName,
  initialBio,
}: {
  userId: string
  initialDisplayName: string | null
  initialBio: string | null
}) {
  const action = updateProfileAsAdmin.bind(null, userId)
  const [state, formAction, pending] = useActionState<
    AdminEditProfileState,
    FormData
  >(action, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="form-item">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={initialDisplayName ?? ''}
          required
          minLength={3}
          maxLength={20}
        />
        {state?.errors?.display_name && (
          <p className="text-xs text-destructive">
            {state.errors.display_name}
          </p>
        )}
      </div>

      <div className="form-item">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initialBio ?? ''}
          maxLength={500}
          rows={4}
        />
        {state?.errors?.bio && (
          <p className="text-xs text-destructive">{state.errors.bio}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
        <Link href="/admin/users" className="btn btn-ghost btn-sm">
          Cancel
        </Link>
      </div>
    </form>
  )
}
