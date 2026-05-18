'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useState } from 'react'

import type { HueFormState } from '@/modules/admin/types/hue-form-state'
import type { Hue } from '@/types/color'

/**
 * Props for {@link HueForm}.
 */
type HueFormProps = {
  /** The server action to invoke on submit. */
  action: (prevState: HueFormState, formData: FormData) => Promise<HueFormState>
  /** When provided, the form creates a child hue under this parent ID. */
  parentId?: string
  /** Default field values when editing an existing hue. */
  defaultValues?: Partial<Hue>
  /** Whether the form is creating a new hue or editing an existing one. */
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
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending
        ? mode === 'create'
          ? 'Creating…'
          : 'Saving…'
        : mode === 'create'
          ? 'Create Hue'
          : 'Save Changes'}
    </button>
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
 * Admin form for creating or editing a hue (parent or child).
 *
 * When `parentId` is provided the form targets a child hue and hides the
 * `sort_order` field (which is only relevant for parent hues). The hex_code
 * field is paired with a native color picker for visual preview.
 *
 * @param props - {@link HueFormProps}
 */
export function HueForm({ action, parentId, defaultValues, mode }: HueFormProps) {
  const [state, formAction] = useActionState(action, null)
  const [slugValue, setSlugValue] = useState(defaultValues?.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit')
  const [hexValue, setHexValue] = useState(defaultValues?.hex_code ?? '#000000')

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setSlugValue(toSlug(e.target.value))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setSlugValue(e.target.value)
  }

  function handleHexTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHexValue(e.target.value)
  }

  function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHexValue(e.target.value)
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}
      {parentId && (
        <input type="hidden" name="parent_id" value={parentId} />
      )}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-600">Hue saved successfully.</p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="hue-name" className="label label-sm">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="hue-name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ''}
          onChange={handleNameChange}
          className="input input-sm"
          placeholder="e.g. Vivid Red"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name}</p>
        )}
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1">
        <label htmlFor="hue-slug" className="label label-sm">
          Slug <span className="text-destructive">*</span>
        </label>
        <input
          id="hue-slug"
          name="slug"
          type="text"
          required
          value={slugValue}
          onChange={handleSlugChange}
          className="input input-sm font-mono"
          placeholder="e.g. vivid-red"
        />
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug}</p>
        )}
      </div>

      {/* Hex code with color picker */}
      <div className="flex flex-col gap-1">
        <label htmlFor="hue-hex" className="label label-sm">
          Hex Code
        </label>
        <div className="flex items-center gap-2">
          <input
            id="hue-hex"
            name="hex_code"
            type="text"
            value={hexValue}
            onChange={handleHexTextChange}
            className="input input-sm font-mono w-32"
            placeholder="#000000"
          />
          <input
            type="color"
            value={hexValue.startsWith('#') && hexValue.length === 7 ? hexValue : '#000000'}
            onChange={handleColorPickerChange}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
            aria-label="Color picker"
          />
          <span
            className="inline-block h-6 w-6 rounded-full border border-border"
            style={{ backgroundColor: hexValue }}
            aria-hidden="true"
          />
        </div>
        {state?.errors?.hex_code && (
          <p className="text-xs text-destructive">{state.errors.hex_code}</p>
        )}
      </div>

      {/* Sort order — only for parent hues */}
      {!parentId && (
        <div className="flex flex-col gap-1">
          <label htmlFor="hue-sort-order" className="label label-sm">
            Sort Order
          </label>
          <input
            id="hue-sort-order"
            name="sort_order"
            type="number"
            min={0}
            defaultValue={defaultValues?.sort_order ?? ''}
            className="input input-sm w-24"
            placeholder="0"
          />
          {state?.errors?.sort_order && (
            <p className="text-xs text-destructive">{state.errors.sort_order}</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  )
}
