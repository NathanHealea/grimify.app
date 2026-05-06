'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { validatePaletteName } from '@/modules/palettes/validation'
import { createPaletteWithPaints } from '@/modules/palettes/actions/create-palette-with-paints'

/**
 * Minimal inline form for creating a new palette and adding a paint in one step.
 *
 * Renders a single name input with Create/Cancel actions. Validates the name
 * with {@link validatePaletteName} before submission and surfaces any client-side
 * validation error inline. On submit, calls {@link createPaletteWithPaints}
 * which redirects to the new palette's edit page on success — the redirect is
 * the success feedback. Action-side errors (auth, DB) are surfaced as toasts.
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
  const [nameError, setNameError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value

    const validationError = validatePaletteName(name)
    if (validationError) {
      setNameError(validationError)
      return
    }
    setNameError(null)

    startTransition(async () => {
      const result = await createPaletteWithPaints({ name, paintIds: [paintId] })
      if (result?.error) {
        toast.error(result.error)
      }
      // On success the action redirects — the redirect itself is feedback
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
      {nameError && (
        <p className="text-xs text-destructive" aria-live="polite">
          {nameError}
        </p>
      )}
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
