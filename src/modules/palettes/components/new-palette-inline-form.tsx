'use client'

import { useTransition } from 'react'

import { validatePaletteName } from '@/modules/palettes/validation'
import { createPaletteWithPaints } from '@/modules/palettes/actions/create-palette-with-paints'

/**
 * Minimal inline form for creating a new palette and adding a paint in one step.
 *
 * Renders a single name input with Create/Cancel actions. Validates the name
 * with {@link validatePaletteName} before submission and surfaces any error
 * inline. On submit, calls {@link createPaletteWithPaints} which redirects to
 * the new palette's edit page.
 *
 * Used inside {@link AddToPaletteMenu} when the user selects "Create new palette".
 *
 * @param props.paintId - UUID of the paint to add to the new palette.
 * @param props.onCancel - Called when the user dismisses the form without saving.
 */
export function NewPaletteInlineForm({
  paintId,
  onCancel,
}: {
  paintId: string
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value

    const nameError = validatePaletteName(name)
    if (nameError) {
      const errorEl = form.querySelector<HTMLParagraphElement>('[data-error]')
      if (errorEl) errorEl.textContent = nameError
      return
    }

    const errorEl = form.querySelector<HTMLParagraphElement>('[data-error]')
    if (errorEl) errorEl.textContent = ''

    startTransition(async () => {
      const result = await createPaletteWithPaints({ name, paintIds: [paintId] })
      if (result?.error) {
        const el = form.querySelector<HTMLParagraphElement>('[data-error]')
        if (el) el.textContent = result.error
      }
      // On success the action redirects — nothing to do here
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2">
      <input
        name="name"
        type="text"
        required
        maxLength={80}
        autoFocus
        placeholder="Palette name"
        className="input input-sm w-full"
        disabled={isPending}
      />
      <p data-error className="text-xs text-destructive" aria-live="polite" />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary btn-sm flex-1"
        >
          {isPending ? 'Creating…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="btn btn-ghost btn-sm flex-1"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
