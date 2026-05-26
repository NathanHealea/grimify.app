'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import type { Army } from '@/modules/armies/types/army'
import type { Palette } from '@/modules/palettes/types/palette'
import type { PaletteFormState } from '@/modules/palettes/types/palette-form-state'
import { updatePalette } from '@/modules/palettes/actions/update-palette'
import { ArmyCombobox } from '@/modules/armies/components/army-combobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'

const initialState = (palette: Palette): PaletteFormState => ({
  values: {
    name: palette.name,
    description: palette.description ?? '',
    isPublic: palette.isPublic,
    armyId: palette.army?.id ?? null,
  },
  errors: {},
})

/**
 * Editable form for a palette's name, description, visibility, and army association.
 *
 * Renders only the `<form>` element — card chrome and surrounding layout belong
 * in the parent. Wires to {@link updatePalette} via `useActionState` and shows
 * inline field errors. Top-level success and form-level error feedback is
 * surfaced via Sonner toasts; field-level errors remain inline beneath their inputs.
 *
 * @param props.palette - The palette being edited; used to seed initial values.
 * @param props.armies - Flat army list passed to {@link ArmyCombobox} for selection.
 */
export function PaletteForm({ palette, armies = [] }: { palette: Palette; armies?: Army[] }) {
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
        <Input
          id="palette-name"
          name="name"
          type="text"
          required
          maxLength={80}
          defaultValue={state.values.name}
          className="w-full"
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

      {armies.length > 0 && (
        <div className="form-item">
          <label className="form-label">Army</label>
          <ArmyCombobox
            armies={armies}
            defaultValue={state.values.armyId}
            name="army_id"
          />
          <p className="text-xs text-muted-foreground">Optional — associate this palette with an army.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="btn-primary btn-sm"
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
