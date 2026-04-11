'use client'

import { type SubmitEvent, useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setupProfile } from '@/modules/profile/actions/setup-profile'
import type { ProfileFormState } from '@/modules/profile/types/profile-form-state'
import type { ProfileFormValues } from '@/modules/profile/types/profile-form-values'
import { validateDisplayName } from '@/modules/profile/validation'

/**
 * Profile display name form.
 *
 * Uses the {@link setupProfile} server action via `useActionState`.
 * Performs client-side validation before submission and displays
 * field-level error feedback from the server.
 *
 * @param props.defaultValues - Pre-populated form values (e.g. auto-generated display name).
 * @param props.submitLabel - Label text for the submit button.
 * @param props.suggestedName - Display name suggested by an OAuth provider, or `null`.
 * @param props.nameAlreadyTaken - Whether the suggested name conflicts with an existing profile.
 */
export function ProfileForm({
  defaultValues,
  submitLabel,
  suggestedName,
  nameAlreadyTaken,
}: {
  defaultValues: ProfileFormValues
  submitLabel: string
  suggestedName?: string | null
  nameAlreadyTaken?: boolean
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(setupProfile, null)
  const [clientError, setClientError] = useState<string | null>(null)

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget)
    const displayName = (formData.get('display_name') as string) ?? ''
    const error = validateDisplayName(displayName)

    if (error) {
      e.preventDefault()
      setClientError(error)
      return
    }

    setClientError(null)
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          defaultValue={defaultValues.display_name}
          placeholder="e.g. Ragnar_42"
          required
          minLength={2}
          maxLength={50}
          pattern="^[a-zA-Z0-9_-]+$"
          autoComplete="username"
        />
        {clientError || state?.errors?.display_name ? (
          <p className="form-message text-sm text-destructive">{clientError || state?.errors?.display_name}</p>
        ) : nameAlreadyTaken && suggestedName ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            The name &apos;{suggestedName}&apos; is already taken. Please choose a different name.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">2-50 characters. Letters, numbers, hyphens, and underscores only.</p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
