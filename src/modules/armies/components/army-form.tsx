'use client'

import { useActionState, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArmyParentSelector } from '@/modules/armies/components/army-parent-selector'
import type { Army } from '@/modules/armies/types/army'
import type { ArmyNode } from '@/modules/armies/types/army-node'
import type { ArmyFormState } from '@/modules/armies/types/army-form-state'

/**
 * Converts a raw string into a URL-safe slug.
 *
 * @param value - The raw input string.
 * @returns A lowercase, hyphenated, alphanumeric-only slug.
 */
function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Props for {@link ArmyForm}.
 */
type ArmyFormProps = {
  /** Whether this form is creating a new army or editing an existing one. */
  mode: 'create' | 'edit'
  /** Existing army data (edit mode only). */
  army?: Army & { parent?: Army | null }
  /** Full army tree for the parent selector dropdown. */
  armies: ArmyNode[]
  /** Server action to bind to the form. */
  action: (prevState: ArmyFormState, formData: FormData) => Promise<ArmyFormState>
}

/**
 * Submit button that reflects form pending state via {@link useFormStatus}.
 *
 * @param props.mode - Create or edit mode to choose the button label.
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
          ? 'Create Army'
          : 'Save Changes'}
    </Button>
  )
}

/**
 * Reusable create/edit form for an army entry.
 *
 * Fields:
 * - **Name** — text input; auto-populates slug while slug is unmodified.
 * - **Slug** — text input; auto-generated from name, editable.
 * - **Parent** — {@link ArmyParentSelector} dropdown (optional; empty = root army).
 * - **Sort order** — number input (optional).
 * - **Icon** — file input (`image/*`); shows a thumbnail preview on selection.
 *   When editing and the army has an `icon_url`, shows the current icon initially.
 *
 * Uses `useActionState` from React 19 with the provided `action`.
 *
 * @param props - {@link ArmyFormProps}
 */
export function ArmyForm({ mode, army, armies, action }: ArmyFormProps) {
  const [state, formAction] = useActionState(action, null)

  const [slugValue, setSlugValue] = useState(army?.slug ?? state?.values?.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit')
  const [previewUrl, setPreviewUrl] = useState<string | null>(army?.icon_url ?? null)

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setSlugValue(toSlug(e.target.value))
    }
  }

  function handleSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setSlugValue(e.target.value)
  }

  function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {army?.id && <input type="hidden" name="id" value={army.id} />}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-600">Army saved successfully.</p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="army-name" className="form-label text-sm">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="army-name"
          name="name"
          type="text"
          required
          defaultValue={army?.name ?? state?.values?.name ?? ''}
          onChange={handleNameChange}
          className="input-sm"
          placeholder="e.g. Space Marines"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name}</p>
        )}
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1">
        <label htmlFor="army-slug" className="form-label text-sm">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id="army-slug"
          name="slug"
          type="text"
          required
          value={slugValue}
          onChange={handleSlugChange}
          className="input-sm font-mono"
          placeholder="e.g. space-marines"
        />
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug}</p>
        )}
      </div>

      {/* Parent */}
      <div className="flex flex-col gap-1">
        <label className="form-label text-sm">Parent Army</label>
        <ArmyParentSelector
          armies={armies}
          defaultValue={army?.parent_id ?? state?.values?.parent_id}
          name="parent_id"
          excludeId={army?.id}
        />
        {state?.errors?.parent_id && (
          <p className="text-xs text-destructive">{state.errors.parent_id}</p>
        )}
      </div>

      {/* Sort order */}
      <div className="flex flex-col gap-1">
        <label htmlFor="army-sort-order" className="form-label text-sm">
          Sort Order
        </label>
        <Input
          id="army-sort-order"
          name="sort_order"
          type="number"
          min={0}
          step={1}
          defaultValue={army?.sort_order ?? state?.values?.sort_order ?? ''}
          className="input-sm w-28"
          placeholder="0"
        />
        {state?.errors?.sort_order && (
          <p className="text-xs text-destructive">{state.errors.sort_order}</p>
        )}
      </div>

      {/* Icon upload */}
      <div className="flex flex-col gap-1">
        <label htmlFor="army-icon" className="form-label text-sm">
          Icon
        </label>
        <div className="flex items-center gap-3">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Army icon preview"
              className="h-12 w-12 rounded border border-border object-contain"
            />
          )}
          <input
            id="army-icon"
            name="icon"
            type="file"
            accept="image/*"
            onChange={handleIconChange}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  )
}
