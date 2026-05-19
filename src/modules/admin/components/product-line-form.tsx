'use client'

import { useActionState, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProductLineFormState } from '@/modules/admin/types/product-line-form-state'
import type { ProductLine } from '@/types/paint'

/**
 * Props for {@link ProductLineForm}.
 */
type ProductLineFormProps = {
  /** The server action to invoke on submit. */
  action: (prevState: ProductLineFormState, formData: FormData) => Promise<ProductLineFormState>
  /** The ID of the brand that owns this product line. */
  brandId: number
  /** Default field values when editing an existing product line. */
  defaultValues?: Partial<ProductLine>
  /** Whether the form is creating a new product line or editing an existing one. */
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
          ? 'Add Product Line'
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
 * Admin form for creating or editing a product line under a brand.
 *
 * Integrates with {@link useActionState} and {@link useFormStatus} to show
 * field-level validation errors and pending state on submit. Slug auto-generates
 * from the name field but can be overridden.
 *
 * @param props - {@link ProductLineFormProps}
 */
export function ProductLineForm({ action, brandId, defaultValues, mode }: ProductLineFormProps) {
  const [state, formAction] = useActionState(action, null)
  const [slugValue, setSlugValue] = useState(defaultValues?.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit')

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
      <input type="hidden" name="brand_id" value={brandId} />
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-600">Product line saved successfully.</p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`pl-name-${brandId}-${defaultValues?.id ?? 'new'}`} className="form-label text-sm">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id={`pl-name-${brandId}-${defaultValues?.id ?? 'new'}`}
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ''}
          onChange={handleNameChange}
          className="input-sm"
          placeholder="e.g. Base"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name}</p>
        )}
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`pl-slug-${brandId}-${defaultValues?.id ?? 'new'}`} className="form-label text-sm">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id={`pl-slug-${brandId}-${defaultValues?.id ?? 'new'}`}
          name="slug"
          type="text"
          required
          value={slugValue}
          onChange={handleSlugChange}
          className="input-sm font-mono"
          placeholder="e.g. base"
        />
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug}</p>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  )
}
