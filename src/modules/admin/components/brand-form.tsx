'use client'

import { useActionState, useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BrandFormState } from '@/modules/admin/types/brand-form-state'
import type { Brand } from '@/types/paint'

/**
 * Props for {@link BrandForm}.
 */
type BrandFormProps = {
  /** The server action to invoke on submit. */
  action: (prevState: BrandFormState, formData: FormData) => Promise<BrandFormState>
  /** Default field values when editing an existing brand. */
  defaultValues?: Partial<Brand>
  /** Whether the form is creating a new brand or editing an existing one. */
  mode: 'create' | 'edit'
}

/**
 * Submit button that reflects pending state via {@link useFormStatus}.
 *
 * @param props.mode - Whether the parent form is in create or edit mode.
 */
function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-primary btn-sm">
      {pending
        ? mode === 'create'
          ? 'Creating…'
          : 'Saving…'
        : mode === 'create'
          ? 'Create Brand'
          : 'Save Changes'}
    </Button>
  )
}

/**
 * Converts a raw string into a URL-safe slug.
 *
 * @param value - The raw input string.
 * @returns A lowercase, hyphenated slug string.
 */
function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Admin form for creating or editing a brand.
 *
 * Integrates with {@link useActionState} and {@link useFormStatus} to show
 * field-level validation errors and pending state on submit.
 *
 * Slug auto-generates from the name field on change but can be overridden
 * by directly editing the slug field.
 *
 * @param props - {@link BrandFormProps}
 */
export function BrandForm({ action, defaultValues, mode }: BrandFormProps) {
  const [state, formAction] = useActionState(action, null)
  const [slugValue, setSlugValue] = useState(defaultValues?.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit')

  useEffect(() => {
    if (state?.success) {
      // Optionally could show a toast; for now, success redirects handle feedback
    }
  }, [state])

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setSlugValue(toSlug(e.target.value))
    }
  }

  function handleSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setSlugValue(e.target.value)
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-600">Brand saved successfully.</p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="brand-name" className="form-label text-sm">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="brand-name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ''}
          onChange={handleNameChange}
          className="input-sm"
          placeholder="e.g. Citadel"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name}</p>
        )}
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1">
        <label htmlFor="brand-slug" className="form-label text-sm">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id="brand-slug"
          name="slug"
          type="text"
          required
          value={slugValue}
          onChange={handleSlugChange}
          className="input-sm font-mono"
          placeholder="e.g. citadel"
        />
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug}</p>
        )}
      </div>

      {/* Website URL */}
      <div className="flex flex-col gap-1">
        <label htmlFor="brand-website" className="form-label text-sm">
          Website URL
        </label>
        <Input
          id="brand-website"
          name="website_url"
          type="url"
          defaultValue={defaultValues?.website_url ?? ''}
          className="input-sm"
          placeholder="https://example.com"
        />
        {state?.errors?.website_url && (
          <p className="text-xs text-destructive">{state.errors.website_url}</p>
        )}
      </div>

      {/* Logo URL */}
      <div className="flex flex-col gap-1">
        <label htmlFor="brand-logo" className="form-label text-sm">
          Logo URL
        </label>
        <Input
          id="brand-logo"
          name="logo_url"
          type="url"
          defaultValue={defaultValues?.logo_url ?? ''}
          className="input-sm"
          placeholder="https://example.com/logo.png"
        />
        {state?.errors?.logo_url && (
          <p className="text-xs text-destructive">{state.errors.logo_url}</p>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  )
}
