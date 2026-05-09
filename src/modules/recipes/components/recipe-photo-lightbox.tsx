'use client'

import { useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'

/**
 * Full-screen modal that displays a single recipe photo with arrow
 * navigation between siblings.
 *
 * Mounted by {@link RecipePhotoGrid} when the user clicks a thumbnail.
 * The lightbox subscribes to global `Escape`, `ArrowLeft`, and
 * `ArrowRight` keys while open and dismisses on backdrop click.
 * Captions render below the image in read-only form.
 *
 * Navigation chevrons are hidden when the user is at the first/last
 * photo. The page indicator (`n / N`) is always rendered.
 *
 * @param props.photos - Ordered list of photos to navigate (same order as the grid).
 * @param props.index - Zero-based index of the currently displayed photo.
 * @param props.onClose - Invoked to dismiss the lightbox.
 * @param props.onNavigate - Invoked with the new index when the user navigates.
 */
export function RecipePhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: RecipePhoto[]
  index: number
  onClose: () => void
  onNavigate: (nextIndex: number) => void
}) {
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const photo = photos[index]

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(index - 1)
  }, [hasPrev, index, onNavigate])
  const goNext = useCallback(() => {
    if (hasNext) onNavigate(index + 1)
  }, [hasNext, index, onNavigate])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, goPrev, goNext])

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close"
        className="btn btn-sm btn-square btn-ghost absolute right-4 top-4 text-white hover:bg-white/10"
      >
        <X className="size-5" aria-hidden />
      </button>
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          aria-label="Previous photo"
          className="btn btn-square btn-ghost absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          aria-label="Next photo"
          className="btn btn-square btn-ghost absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      )}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full max-w-full flex-col items-center gap-3"
      >
        {photo.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={photo.caption ?? ''}
            width={photo.widthPx ?? undefined}
            height={photo.heightPx ?? undefined}
            className="max-h-[80vh] max-w-full object-contain"
          />
        )}
        {photo.caption && (
          <figcaption className="max-w-prose text-center text-sm text-white">
            {photo.caption}
          </figcaption>
        )}
        <p className="text-xs text-white/60">
          {index + 1} / {photos.length}
        </p>
      </figure>
    </div>
  )
}
