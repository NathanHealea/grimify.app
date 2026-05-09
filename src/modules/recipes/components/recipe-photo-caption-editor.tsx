'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { updateRecipePhoto } from '@/modules/recipes/actions/update-recipe-photo'

const CAPTION_MAX_LENGTH = 200

/**
 * Inline caption editor for a recipe photo.
 *
 * Renders a single-line text input that auto-saves on blur via
 * {@link updateRecipePhoto}. Pressing Enter blurs (and saves);
 * pressing Escape reverts to the last confirmed caption. Failed saves
 * roll back the local value and surface the error via a Sonner toast.
 *
 * The component does not render its own toggle — the parent (typically
 * {@link RecipePhotoThumbnail}) controls when this editor mounts.
 *
 * @param props.photoId - UUID of the photo to update.
 * @param props.initialCaption - Server-side caption (`null` when none).
 * @param props.onSaved - Optional callback invoked with the new caption on a successful save.
 * @param props.autoFocus - Whether to focus the input on mount.
 */
export function RecipePhotoCaptionEditor({
  photoId,
  initialCaption,
  onSaved,
  autoFocus = true,
}: {
  photoId: string
  initialCaption: string | null
  onSaved?: (caption: string | null) => void
  autoFocus?: boolean
}) {
  const [value, setValue] = useState(initialCaption ?? '')
  const [lastSaved, setLastSaved] = useState(initialCaption ?? '')
  const [trackedInitial, setTrackedInitial] = useState(initialCaption ?? '')
  const [isPending, startTransition] = useTransition()

  const incoming = initialCaption ?? ''
  if (incoming !== trackedInitial) {
    setTrackedInitial(incoming)
    setLastSaved(incoming)
    setValue(incoming)
  }

  function commit() {
    const next = value.trim()
    if (next === lastSaved.trim()) return
    if (next.length > CAPTION_MAX_LENGTH) {
      toast.error(`Caption must be ${CAPTION_MAX_LENGTH} characters or fewer.`)
      setValue(lastSaved)
      return
    }
    const previous = lastSaved
    startTransition(async () => {
      const result = await updateRecipePhoto(photoId, { caption: next })
      if ('error' in result) {
        toast.error(result.error)
        setValue(previous)
        return
      }
      const saved = result.photo.caption ?? ''
      setLastSaved(saved)
      setValue(saved)
      onSaved?.(result.photo.caption)
    })
  }

  return (
    <input
      type="text"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setValue(lastSaved)
          e.currentTarget.blur()
        }
      }}
      maxLength={CAPTION_MAX_LENGTH}
      disabled={isPending}
      placeholder="Add caption…"
      aria-label="Photo caption"
      className="input input-sm w-full"
    />
  )
}
