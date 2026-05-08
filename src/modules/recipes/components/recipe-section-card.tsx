'use client'

import { useState, useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { addRecipeStep } from '@/modules/recipes/actions/add-recipe-step'
import { deleteRecipeSection } from '@/modules/recipes/actions/delete-recipe-section'
import { updateRecipeSection } from '@/modules/recipes/actions/update-recipe-section'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import type { Palette } from '@/modules/palettes/types/palette'
import { RecipeStepList } from '@/modules/recipes/components/recipe-step-list'
import type { RecipeSection } from '@/modules/recipes/types/recipe-section'

/**
 * One section in the recipe builder.
 *
 * Renders a sortable card containing:
 *
 * - An inline-editable title input that auto-saves on blur via
 *   {@link updateRecipeSection}.
 * - A drag handle (sole DnD activator) so inputs and buttons remain clickable.
 * - The embedded {@link RecipeStepList} for this section.
 * - An "Add step" button that calls {@link addRecipeStep}.
 * - A "Delete section" button (confirms via `window.confirm`) that calls
 *   {@link deleteRecipeSection}; deletion cascades to the section's steps.
 *
 * The label is computed from the section index by the parent
 * `RecipeSectionList` and is passed as a 1-based number.
 *
 * @param props.section - Section row being edited; seeds title and steps.
 * @param props.label - 1-based section number used in step labels (e.g. `"1"`).
 * @param props.dndId - Mount-stable DnD id assigned by the parent section list.
 * @param props.palette - Hydrated linked palette (or `null`); forwarded to each
 *   step so its paint picker can render palette-mode candidates.
 */
export function RecipeSectionCard({
  section,
  label,
  dndId,
  palette,
}: {
  section: RecipeSection
  label: string
  dndId: string
  palette: Palette | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId })

  const [isPending, startTransition] = useTransition()
  const [savedTitle, setSavedTitle] = useState(section.title)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleTitleBlur(rawValue: string) {
    const trimmed = rawValue.trim()
    if (trimmed === savedTitle) return
    if (!trimmed) {
      toast.error('Section title is required.')
      return
    }

    startTransition(async () => {
      const result = await updateRecipeSection(section.id, { title: trimmed })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setSavedTitle(trimmed)
    })
  }

  function handleAddStep() {
    startTransition(async () => {
      const result = await addRecipeStep(section.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
    })
  }

  function handleDelete() {
    const stepCount = section.steps.length
    const message =
      stepCount > 0
        ? `Delete section "${savedTitle}" and its ${stepCount} step${stepCount === 1 ? '' : 's'}?`
        : `Delete section "${savedTitle}"?`
    if (typeof window !== 'undefined' && !window.confirm(message)) return

    startTransition(async () => {
      const result = await deleteRecipeSection(section.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Section "${savedTitle}" deleted`)
    })
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={[
        'flex flex-col gap-3 rounded-xl border border-border p-4',
        isDragging ? 'shadow-lg bg-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="flex items-start gap-2">
        <PaletteDragHandle
          ref={setActivatorNodeRef}
          aria-label={`Reorder section ${label}`}
          {...attributes}
          {...listeners}
        />
        <span className="mt-1 text-sm font-semibold tabular-nums text-muted-foreground">
          {label}.
        </span>
        <input
          type="text"
          defaultValue={savedTitle}
          maxLength={120}
          required
          onBlur={(e) => handleTitleBlur(e.currentTarget.value)}
          placeholder="Section title"
          className="input flex-1 text-base font-medium"
          aria-label={`Section ${label} title`}
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="btn btn-sm btn-ghost text-destructive hover:text-destructive"
          aria-label={`Delete section ${label}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </header>

      <RecipeStepList
        sectionId={section.id}
        sectionLabel={label}
        steps={section.steps}
        palette={palette}
      />

      <div>
        <button
          type="button"
          onClick={handleAddStep}
          disabled={isPending}
          className="btn btn-sm btn-ghost"
        >
          <Plus className="size-4" aria-hidden />
          Add step
        </button>
      </div>
    </section>
  )
}
