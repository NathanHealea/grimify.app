'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'
import { addRecipeNote } from '@/modules/recipes/actions/add-recipe-note'
import { deleteRecipeNote } from '@/modules/recipes/actions/delete-recipe-note'
import { updateRecipeNote } from '@/modules/recipes/actions/update-recipe-note'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipeNoteParent } from '@/modules/recipes/types/recipe-note-parent'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'

const NOTE_BODY_MAX = 5000

/**
 * Single editable note card with Edit/Preview toggle and auto-save on blur.
 *
 * Used inside {@link RecipeNoteList} for both recipe-level and step-level
 * note grids. Backed by a controlled `<textarea>` whose value commits via
 * {@link updateRecipeNote} when blurred (or {@link addRecipeNote} when
 * the card is a draft — i.e. `noteId === null`). Empty bodies on blur
 * are treated as a delete request: existing notes prompt a confirm and
 * call {@link deleteRecipeNote}; drafts are silently removed via
 * {@link onDraftRemove}.
 *
 * Drafts (no server id yet) display the same UI as a saved note but
 * skip drag-reorder until the first save returns a real id.
 *
 * @param props.dndId - Mount-stable id for dnd-kit's `useSortable`.
 * @param props.noteId - Server UUID. `null` means this is an unsaved draft.
 * @param props.parent - Discriminated union for the owning recipe or step.
 * @param props.initialBody - Starting body text (empty for fresh drafts).
 * @param props.startInEdit - When true, mounts in edit mode and focuses the textarea.
 * @param props.onSaved - Called after a successful create/update with the persisted note.
 * @param props.onDeleted - Called after a successful delete with the removed note's id.
 * @param props.onDraftRemove - Called when an empty draft should be discarded.
 */
export function RecipeNoteCard({
  dndId,
  noteId,
  parent,
  initialBody,
  startInEdit = false,
  onSaved,
  onDeleted,
  onDraftRemove,
}: {
  dndId: string
  noteId: string | null
  parent: RecipeNoteParent
  initialBody: string
  startInEdit?: boolean
  onSaved?: (note: RecipeNote) => void
  onDeleted?: (noteId: string) => void
  onDraftRemove?: () => void
}) {
  const [body, setBody] = useState(initialBody)
  const [lastSaved, setLastSaved] = useState(initialBody)
  const [isPreview, setIsPreview] = useState(!startInEdit)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDraft = noteId === null

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId, disabled: isDraft })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (startInEdit && textareaRef.current) {
      textareaRef.current.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function commit() {
    const next = body.trim()
    if (next === lastSaved.trim()) return

    if (next.length > NOTE_BODY_MAX) {
      toast.error(`Note body must be ${NOTE_BODY_MAX} characters or fewer.`)
      setBody(lastSaved)
      return
    }

    if (next.length === 0) {
      if (isDraft) {
        onDraftRemove?.()
        return
      }
      const ok =
        typeof window === 'undefined' ||
        window.confirm('Empty notes are deleted. Remove this note?')
      if (!ok) {
        setBody(lastSaved)
        return
      }
      handleDelete()
      return
    }

    if (isDraft) {
      startTransition(async () => {
        const result = await addRecipeNote(parent, next)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        setLastSaved(result.note.body)
        setBody(result.note.body)
        onSaved?.(result.note)
      })
      return
    }

    const previous = lastSaved
    startTransition(async () => {
      const result = await updateRecipeNote(noteId, { body: next })
      if ('error' in result) {
        toast.error(result.error)
        setBody(previous)
        return
      }
      setLastSaved(result.note.body)
      setBody(result.note.body)
      onSaved?.(result.note)
    })
  }

  function handleDelete() {
    if (isDraft) {
      onDraftRemove?.()
      return
    }
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this note? This cannot be undone.')
    ) {
      return
    }
    startDelete(async () => {
      const result = await deleteRecipeNote(noteId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      onDeleted?.(noteId)
      toast.success('Note deleted')
    })
  }

  function togglePreview() {
    if (!isPreview) {
      commit()
    }
    setIsPreview((p) => !p)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border border-border bg-base-100',
        'border-l-4 border-l-primary',
        isDragging && 'shadow-lg',
      )}
    >
      <div className="flex items-start gap-1 p-2">
        {!isDraft ? (
          <PaletteDragHandle
            ref={setActivatorNodeRef}
            aria-label="Reorder note"
            {...attributes}
            {...listeners}
          />
        ) : (
          <span className="w-6" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {isPreview ? (
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className="block w-full cursor-text text-left"
              aria-label="Edit note"
            >
              {body.trim().length > 0 ? (
                <MarkdownRenderer content={body} className="text-sm" />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Empty note — click to edit
                </p>
              )}
            </button>
          ) : (
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={commit}
              maxLength={NOTE_BODY_MAX}
              rows={4}
              placeholder="Add a note (markdown supported)…"
              aria-label="Note body"
              className="textarea w-full text-sm"
              disabled={isPending || isDeleting}
            />
          )}
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span aria-live="polite">
              {isPending ? 'Saving…' : isDeleting ? 'Deleting…' : ''}
            </span>
            <span className="tabular-nums">
              {body.length} / {NOTE_BODY_MAX}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={togglePreview}
            className="btn btn-xs btn-square btn-ghost"
            aria-label={isPreview ? 'Edit note' : 'Preview note'}
            aria-pressed={!isPreview}
            title={isPreview ? 'Edit' : 'Preview'}
          >
            {isPreview ? (
              <Pencil className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-xs btn-square btn-ghost text-destructive hover:text-destructive"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
