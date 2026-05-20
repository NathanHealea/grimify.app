'use client'

import { type SubmitEvent, useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'
import { updateProfile } from '@/modules/user/actions/update-profile'
import type { UpdateProfileFormState } from '@/modules/user/types/update-profile-form-state'
import type { UpdateProfileFormValues } from '@/modules/user/types/update-profile-form-values'
import { validateDisplayName } from '@/modules/user/validation'

/**
 * Profile info form for updating display name and bio.
 *
 * Uses the {@link updateProfile} server action via `useActionState`. The bio
 * field is rendered with {@link MarkdownEditor} (uncontrolled — value is read
 * via FormData on submit). Performs client-side display name validation before
 * submission and surfaces field-level and general errors from the server.
 *
 * @param props.defaultValues - Current profile values used to pre-populate the form.
 */
export function EditProfileForm({ defaultValues }: { defaultValues: UpdateProfileFormValues }) {
  const [state, formAction, pending] = useActionState<UpdateProfileFormState, FormData>(updateProfile, null)
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
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">Profile updated.</p>
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
          minLength={3}
          maxLength={20}
          pattern="^[a-zA-Z0-9_-]+$"
          autoComplete="username"
        />
        {clientError || state?.errors?.display_name ? (
          <p className="text-sm text-destructive">{clientError || state?.errors?.display_name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">3-20 characters. Letters, numbers, hyphens, and underscores only.</p>
        )}
      </div>

      <div className="form-item">
        <Label htmlFor="bio">Bio</Label>
        <MarkdownEditor
          id="bio"
          name="bio"
          defaultValue={defaultValues.bio ?? ''}
          maxLength={500}
          placeholder="Tell the community about yourself…"
          error={state?.errors?.bio}
        />
      </div>

      <Button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
