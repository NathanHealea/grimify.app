'use client'

import { useState, useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Pencil, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'
import { deleteRecipePhoto } from '@/modules/recipes/actions/delete-recipe-photo'
import { setRecipeCoverPhoto } from '@/modules/recipes/actions/set-recipe-cover-photo'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import { RecipePhotoCaptionEditor } from '@/modules/recipes/components/recipe-photo-caption-editor'

/**
 * A single tile in {@link RecipePhotoGrid}.
 *
 * Renders the photo thumbnail. In edit mode (`canEdit={true}`) the tile
 * is sortable via dnd-kit (the drag handle in the overlay is the sole
 * activator) and the hover overlay exposes:
 *
 * - Drag handle (top-left)
 * - "Set as cover" toggle (top-right) — only when {@link canBeCover} is true;
 *   the icon is filled when this photo is the current cover ({@link isCover})
 * - Caption-edit toggle and delete button (bottom row)
 *
 * Clicking the image area calls {@link onOpen} to open the lightbox at
 * this position. In read mode the overlay is hidden but the click target
 * remains.
 *
 * @param props.photo - The hydrated {@link RecipePhoto}.
 * @param props.canEdit - When true, renders the overlay controls.
 * @param props.canBeCover - When true (recipe-level photos), renders the cover toggle.
 * @param props.isCover - True when `photo.id` matches the recipe's current cover.
 * @param props.recipeId - Recipe UUID; required when {@link canBeCover} is true.
 * @param props.onOpen - Invoked when the image is clicked (opens the lightbox).
 * @param props.dndId - Mount-stable DnD id from `RecipePhotoGrid`; required when `canEdit` is true.
 */
export function RecipePhotoThumbnail({
  photo,
  canEdit,
  canBeCover = false,
  isCover = false,
  recipeId,
  onOpen,
  dndId,
}: {
  photo: RecipePhoto
  canEdit: boolean
  canBeCover?: boolean
  isCover?: boolean
  recipeId?: string
  onOpen: () => void
  dndId?: string
}) {
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [isDeleting, startDelete] = useTransition()
  const [isCovering, startCover] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId ?? '', disabled: !canEdit || !dndId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleDelete() {
    if (typeof window !== 'undefined' && !window.confirm('Delete this photo? This cannot be undone.')) {
      return
    }
    startDelete(async () => {
      const result = await deleteRecipePhoto(photo.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Photo deleted')
    })
  }

  function handleSetCover() {
    if (!recipeId) return
    startCover(async () => {
      const result = await setRecipeCoverPhoto(recipeId, isCover ? null : photo.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(isCover ? 'Cover cleared' : 'Cover photo set')
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group relative aspect-square overflow-hidden rounded-md border border-border bg-muted',
        isDragging ? 'shadow-lg' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={photo.caption ? `Open photo: ${photo.caption}` : 'Open photo'}
        className="absolute inset-0 cursor-zoom-in"
      >
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={photo.caption ?? ''}
            loading="lazy"
            width={photo.widthPx ?? undefined}
            height={photo.heightPx ?? undefined}
            className="size-full object-cover"
          />
        ) : null}
      </button>
      {canEdit && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <div className="pointer-events-auto flex items-start justify-between gap-1">
            {dndId ? (
              <PaletteDragHandle
                ref={setActivatorNodeRef}
                aria-label="Reorder photo"
                {...attributes}
                {...listeners}
              />
            ) : (
              <span />
            )}
            {canBeCover && (
              <button
                type="button"
                onClick={handleSetCover}
                disabled={isCovering}
                className="btn btn-xs btn-square btn-ghost bg-background/80 hover:bg-background"
                aria-label={isCover ? 'Clear cover photo' : 'Set as cover photo'}
                aria-pressed={isCover}
                title={isCover ? 'Clear cover photo' : 'Set as cover photo'}
              >
                <Star
                  className={[
                    'size-4',
                    isCover ? 'fill-yellow-500 stroke-yellow-500' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden
                />
              </button>
            )}
          </div>
          <div className="pointer-events-auto flex items-end justify-between gap-1">
            <button
              type="button"
              onClick={() => setIsEditingCaption((s) => !s)}
              className="btn btn-xs btn-square btn-ghost bg-background/80 hover:bg-background"
              aria-label={isEditingCaption ? 'Hide caption editor' : 'Edit caption'}
              aria-pressed={isEditingCaption}
              title={isEditingCaption ? 'Hide caption' : 'Edit caption'}
            >
              {isEditingCaption ? (
                <X className="size-4" aria-hidden />
              ) : (
                <Pencil className="size-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-xs btn-square btn-ghost bg-background/80 hover:bg-background text-destructive hover:text-destructive"
              aria-label="Delete photo"
              title="Delete photo"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
      {canEdit && isEditingCaption && (
        <div className="absolute inset-x-1.5 bottom-1.5 z-10">
          <RecipePhotoCaptionEditor
            photoId={photo.id}
            initialCaption={photo.caption}
            onSaved={() => setIsEditingCaption(false)}
          />
        </div>
      )}
    </div>
  )
}
