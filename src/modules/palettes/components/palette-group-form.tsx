'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { validateGroupName } from '@/modules/palettes/validation'
import { createPaletteGroup } from '@/modules/palettes/actions/create-palette-group'

/**
 * Inline form for creating a new group within a palette.
 *
 * Validates the name client-side with {@link validateGroupName} before calling
 * {@link createPaletteGroup}. On successful submit the input is cleared.
 * Action errors are surfaced via Sonner toasts.
 *
 * @param props.paletteId - UUID of the palette that will own the new group.
 */
export function PaletteGroupForm({ paletteId }: { paletteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [nameError, setNameError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = inputRef.current?.value ?? ''

    const validationError = validateGroupName(name)
    if (validationError) {
      setNameError(validationError)
      return
    }
    setNameError(null)

    startTransition(async () => {
      const result = await createPaletteGroup(paletteId, name.trim())
      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <input
        ref={inputRef}
        name="name"
        type="text"
        maxLength={100}
        placeholder="Group name"
        disabled={isPending}
        className="input input-sm flex-1"
        aria-label="New group name"
      />
      {nameError && (
        <p className="text-xs text-destructive" aria-live="polite">
          {nameError}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-sm btn-outline whitespace-nowrap"
      >
        {isPending ? 'Adding…' : 'Add group'}
      </button>
    </form>
  )
}
