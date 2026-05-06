'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PaletteFormState } from '@/modules/palettes/types/palette-form-state'
import { updatePalette } from '@/modules/palettes/actions/update-palette'
import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'

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
 * inline field errors. Top-level success and form-level error feedback is
 * surfaced via Sonner toasts (see effect below); field-level errors remain
 * inline beneath their inputs.
 *
 * @param props.palette - The palette being edited; used to seed initial values.
 */
export function PaletteForm({ palette }: { palette: Palette }) {
  const [state, formAction, isPending] = useActionState(
    updatePalette,
    initialState(palette)
  )

  useEffect(() => {
    if (state.errors.form) {
      toast.error(state.errors.form)
    } else if (state.success) {
      toast.success('Palette saved')
    }
  }, [state])

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
        <MarkdownEditor
          id="palette-description"
          name="description"
          defaultValue={state.values.description}
          maxLength={1000}
          placeholder="Optional description"
          error={state.errors.description}
        />
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary btn-sm"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
