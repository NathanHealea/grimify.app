'use client'

import { useActionState } from 'react'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PaletteFormState } from '@/modules/palettes/types/palette-form-state'
import { updatePalette } from '@/modules/palettes/actions/update-palette'

const initialState = (palette: Palette): PaletteFormState => ({
  values: {
    name: palette.name,
    description: palette.description ?? '',
    isPublic: palette.isPublic,
  },
  errors: {},
})

/**
 * Editable form for a palette's name, description, and visibility.
 *
 * Renders only the `<form>` element — card chrome and surrounding layout belong
 * in the parent. Wires to {@link updatePalette} via `useActionState` and shows
 * inline field errors. A small `aria-live` region confirms a successful save
 * without requiring a toast library.
 *
 * @param props.palette - The palette being edited; used to seed initial values.
 */
export function PaletteForm({ palette }: { palette: Palette }) {
  const [state, formAction, isPending] = useActionState(
    updatePalette,
    initialState(palette)
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={palette.id} />

      <div className="form-item">
        <label htmlFor="palette-name" className="form-label">
          Name
        </label>
        <input
          id="palette-name"
          name="name"
          type="text"
          required
          maxLength={80}
          defaultValue={state.values.name}
          className="input w-full"
          placeholder="My palette"
        />
        {state.errors.name && (
          <p className="text-sm text-destructive">{state.errors.name}</p>
        )}
      </div>

      <div className="form-item">
        <label htmlFor="palette-description" className="form-label">
          Description
        </label>
        <textarea
          id="palette-description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={state.values.description}
          className="input w-full"
          placeholder="Optional description"
        />
        {state.errors.description && (
          <p className="text-sm text-destructive">{state.errors.description}</p>
        )}
      </div>

      <div className="form-item flex-row items-center gap-3">
        <input
          id="palette-is-public"
          name="isPublic"
          type="checkbox"
          value="true"
          defaultChecked={state.values.isPublic}
          className="checkbox"
        />
        <label htmlFor="palette-is-public" className="form-label mb-0">
          Make public
        </label>
      </div>

      {state.errors.form && (
        <p className="text-sm text-destructive">{state.errors.form}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary btn-sm"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {state.success && (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Saved
          </p>
        )}
      </div>
    </form>
  )
}
