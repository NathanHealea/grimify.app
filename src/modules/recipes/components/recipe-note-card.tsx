'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { addRecipeNote } from '@/modules/recipes/actions/add-recipe-note'
import { deleteRecipeNote } from '@/modules/recipes/actions/delete-recipe-note'
import { updateRecipeNote } from '@/modules/recipes/actions/update-recipe-note'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipeNoteParent } from '@/modules/recipes/types/recipe-note-parent'

const NOTE_BODY_MAX = 5000

/**
 * Single editable note card with a body region and footer toolbar.
 *
 * Used inside {@link RecipeNoteList} for both recipe-level and step-level
 * note grids. The body region pairs a narrow drag gutter with a
 * borderless `<textarea>` so the card itself frames the editor; the
 * footer toolbar holds the Save and Delete actions on the left and the
 * character counter on the right. Saves are explicit — drafts
 * (`noteId === null`) call {@link addRecipeNote}, persisted notes call
 * {@link updateRecipeNote}. Note bodies are plain text; the read-only
 * detail view preserves newlines but does not interpret markdown.
 *
 * The Save button is disabled while a save is in flight, while the
 * trimmed body matches what is already on the server, or while a fresh
 * draft is empty. Deleting a saved note prompts a `confirm()`; deleting
 * a draft drops it via {@link onDraftRemove} with no server call.
 *
 * Drafts skip drag-reorder until the first save returns a real id.
 *
 * @param props.dndId - Mount-stable id for dnd-kit's `useSortable`.
 * @param props.noteId - Server UUID. `null` means this is an unsaved draft.
 * @param props.parent - Discriminated union for the owning recipe or step.
 * @param props.initialBody - Starting body text (empty for fresh drafts).
 * @param props.startInEdit - When true, focuses the textarea on mount.
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

  const trimmedBody = body.trim()
  const hasChanges = trimmedBody !== lastSaved.trim()
  const canSave =
    !isPending &&
    !isDeleting &&
    hasChanges &&
    trimmedBody.length > 0 &&
    trimmedBody.length <= NOTE_BODY_MAX

  function handleSave() {
    if (!canSave) return
    const next = trimmedBody

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col overflow-hidden rounded-md border border-border bg-base-100',
        'focus-within:border-primary',
        isDragging && 'shadow-lg',
      )}
    >
      <div className="flex">
        {!isDraft ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label="Reorder note"
            className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center border-r border-border/50 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        ) : (
          <div
            className="flex w-7 shrink-0 items-center justify-center border-r border-border/50 text-muted-foreground/30"
            aria-hidden
          >
            <GripVertical className="size-4" />
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={NOTE_BODY_MAX}
          rows={4}
          placeholder="Add a note…"
          aria-label="Note body"
          className="block w-full resize-y border-0 bg-transparent px-3 py-2 text-sm leading-relaxed focus:outline-none"
          disabled={isPending || isDeleting}
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-base-200/40 px-2 py-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex h-[26px] items-center gap-1 rounded px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Save className="size-3.5" aria-hidden />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex h-[26px] items-center gap-1 rounded px-2 text-xs font-medium text-destructive hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Trash2 className="size-3.5" aria-hidden />
            <span>Delete</span>
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            {isPending ? 'Saving…' : isDeleting ? 'Deleting…' : ''}
          </span>
          <span className="tabular-nums">
            {body.length} / {NOTE_BODY_MAX}
          </span>
        </div>
      </div>
    </div>
  )
}
