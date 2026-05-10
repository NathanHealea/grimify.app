'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'
import type { RecipePhotoParent } from '@/modules/recipes/types/recipe-photo-parent'
import { reorderRecipePhotos } from '@/modules/recipes/actions/reorder-recipe-photos'
import { RecipePhotoLightbox } from '@/modules/recipes/components/recipe-photo-lightbox'
import { RecipePhotoThumbnail } from '@/modules/recipes/components/recipe-photo-thumbnail'
import { RecipePhotoUploader } from '@/modules/recipes/components/recipe-photo-uploader'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

/**
 * Mount-stable wrapper assigning a synthetic DnD id to each photo.
 *
 * The `recipe_photos.id` would normally serve, but a synthetic UUID
 * keeps the optimistic ordering coherent across {@link reorderRecipePhotos}
 * round-trips even if the server later swaps row identities (e.g.,
 * if reorder were re-implemented as DELETE+INSERT).
 */
type DraggablePhoto = {
  dndId: string
  photo: RecipePhoto
}

function seedSlots(photos: RecipePhoto[]): DraggablePhoto[] {
  return photos.map((photo) => ({ dndId: crypto.randomUUID(), photo }))
}

/**
 * Photo grid for both the recipe builder and the read view.
 *
 * In edit mode (`canEdit={true}`) wraps thumbnails in a dnd-kit grid
 * (uses `rectSortingStrategy`); the new order persists optimistically
 * via {@link reorderRecipePhotos} and rolls back on failure with a
 * Sonner toast. The {@link RecipePhotoUploader} renders as the last
 * grid cell so the upload zone matches a thumbnail tile.
 *
 * In read mode (`canEdit={false}`) renders a plain grid; clicking any
 * thumbnail opens {@link RecipePhotoLightbox}. When `photos` is empty
 * read mode renders nothing — callers should hide their gallery
 * heading themselves.
 *
 * @param props.parent - Discriminated union for which entity owns these photos.
 * @param props.recipeId - The owning recipe UUID — required for the uploader path.
 * @param props.photos - Ordered photos (head first).
 * @param props.canEdit - When true, renders DnD wiring, uploader, and overlays.
 * @param props.coverPhotoId - The recipe's current cover photo id, or `null`.
 * @param props.compact - When true (typically step-level), uses a tighter grid layout.
 * @param props.emptyLabel - Override for the empty-state copy in edit mode.
 */
export function RecipePhotoGrid({
  parent,
  recipeId,
  photos,
  canEdit,
  coverPhotoId = null,
  compact = false,
  emptyLabel,
}: {
  parent: RecipePhotoParent
  recipeId: string
  photos: RecipePhoto[]
  canEdit: boolean
  coverPhotoId?: string | null
  compact?: boolean
  emptyLabel?: string
}) {
  const [slots, setSlots] = useState<DraggablePhoto[]>(() => seedSlots(photos))
  const [trackedPhotos, setTrackedPhotos] = useState<RecipePhoto[]>(photos)
  const [latestConfirmed, setLatestConfirmed] = useState<DraggablePhoto[]>(slots)
  const [, startTransition] = useTransition()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos !== trackedPhotos) {
    const next = seedSlots(photos)
    setTrackedPhotos(photos)
    setSlots(next)
    setLatestConfirmed(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = slots.findIndex((s) => s.dndId === active.id)
    const toIndex = slots.findIndex((s) => s.dndId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const previousSlots = latestConfirmed
    const newSlots = reorderArray(slots, fromIndex, toIndex)
    setSlots(newSlots)

    startTransition(async () => {
      const result = await reorderRecipePhotos(
        parent,
        newSlots.map((s) => s.photo.id),
      )
      if (result?.error) {
        setSlots(previousSlots)
        toast.error(result.error)
      } else {
        setLatestConfirmed(newSlots)
      }
    })
  }

  const orderedPhotos = slots.map((s) => s.photo)
  const gridClass = [
    'grid gap-2',
    compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  ].join(' ')

  if (!canEdit) {
    if (photos.length === 0) {
      return null
    }
    return (
      <>
        <div className={gridClass}>
          {photos.map((photo, i) => (
            <RecipePhotoThumbnail
              key={photo.id}
              photo={photo}
              canEdit={false}
              onOpen={() => setLightboxIndex(i)}
            />
          ))}
        </div>
        {lightboxIndex !== null && (
          <RecipePhotoLightbox
            photos={photos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {photos.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {emptyLabel ?? 'No photos yet — drop or click below to upload.'}
          </p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slots.map((s) => s.dndId)} strategy={rectSortingStrategy}>
            <div className={gridClass}>
              {slots.map((slot, i) => (
                <RecipePhotoThumbnail
                  key={slot.dndId}
                  dndId={slot.dndId}
                  photo={slot.photo}
                  canEdit
                  canBeCover={parent.kind === 'recipe'}
                  isCover={coverPhotoId === slot.photo.id}
                  recipeId={recipeId}
                  onOpen={() => setLightboxIndex(i)}
                />
              ))}
              <RecipePhotoUploader parent={parent} recipeId={recipeId} compact={compact} />
            </div>
          </SortableContext>
        </DndContext>
      </div>
      {lightboxIndex !== null && (
        <RecipePhotoLightbox
          photos={orderedPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  )
}
