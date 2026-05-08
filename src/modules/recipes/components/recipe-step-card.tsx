'use client'

import { useState, useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import type { Palette } from '@/modules/palettes/types/palette'
import { deleteRecipeStep } from '@/modules/recipes/actions/delete-recipe-step'
import { updateRecipeStep } from '@/modules/recipes/actions/update-recipe-step'
import { RecipeStepPaintList } from '@/modules/recipes/components/recipe-step-paint-list'
import { RecipeStepPaintPicker } from '@/modules/recipes/components/recipe-step-paint-picker'
import type { RecipeStep } from '@/modules/recipes/types/recipe-step'

/**
 * One editable step within a recipe section.
 *
 * Title and technique are uncontrolled inputs that auto-save on blur via
 * {@link updateRecipeStep}. The instructions field uses the shared
 * {@link MarkdownEditor}; a wrapping element catches blur and saves only when
 * focus truly leaves the editor (so toolbar clicks do not cause spurious
 * saves). All three fields compare the current value to the last-saved value
 * and skip the round-trip when unchanged.
 *
 * The card is sortable: the drag handle is the sole activator, so the inputs
 * and delete button stay clickable. Deleting prompts a `confirm()` and calls
 * {@link deleteRecipeStep}.
 *
 * @param props.step - Step row being edited; seeds initial input values.
 * @param props.label - Computed display label (e.g. `"1.1"`).
 * @param props.dndId - Mount-stable DnD id assigned by the parent step list.
 * @param props.palette - The recipe's linked palette, or `null` when none.
 *   Forwarded to {@link RecipeStepPaintPicker} so palette-mode is the default
 *   when the recipe has a pinned palette.
 */
export function RecipeStepCard({
  step,
  label,
  dndId,
  palette,
}: {
  step: RecipeStep
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
  const [savedTitle, setSavedTitle] = useState(step.title ?? '')
  const [savedTechnique, setSavedTechnique] = useState(step.technique ?? '')
  const [savedInstructions, setSavedInstructions] = useState(
    step.instructions ?? '',
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function saveField(
    field: 'title' | 'technique' | 'instructions',
    rawValue: string,
  ) {
    const lastSaved =
      field === 'title'
        ? savedTitle
        : field === 'technique'
          ? savedTechnique
          : savedInstructions
    if (rawValue === lastSaved) return

    startTransition(async () => {
      const result = await updateRecipeStep(step.id, { [field]: rawValue })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (field === 'title') setSavedTitle(rawValue)
      else if (field === 'technique') setSavedTechnique(rawValue)
      else setSavedInstructions(rawValue)
    })
  }

  function handleDelete() {
    if (typeof window !== 'undefined' && !window.confirm(`Delete step ${label}?`)) {
      return
    }
    startTransition(async () => {
      const result = await deleteRecipeStep(step.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Step ${label} deleted`)
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex flex-col gap-3 rounded-lg border border-border p-3',
        isDragging ? 'shadow-lg bg-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-2">
        <PaletteDragHandle
          ref={setActivatorNodeRef}
          aria-label={`Reorder step ${label}`}
          {...attributes}
          {...listeners}
        />
        <span className="mt-1 text-sm font-medium tabular-nums text-muted-foreground">
          {label}
        </span>
        <input
          type="text"
          defaultValue={savedTitle}
          maxLength={120}
          onBlur={(e) => saveField('title', e.currentTarget.value)}
          placeholder="Step title (optional)"
          className="input flex-1"
          aria-label={`Step ${label} title`}
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="btn btn-sm btn-ghost text-destructive hover:text-destructive"
          aria-label={`Delete step ${label}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className="form-item">
        <label
          className="form-label"
          htmlFor={`step-${step.id}-technique`}
        >
          Technique
        </label>
        <input
          id={`step-${step.id}-technique`}
          type="text"
          defaultValue={savedTechnique}
          maxLength={60}
          onBlur={(e) => saveField('technique', e.currentTarget.value)}
          placeholder="e.g. stipple, wet blend"
          className="input"
        />
      </div>

      <div className="form-item">
        <label
          className="form-label"
          htmlFor={`step-${step.id}-instructions`}
        >
          Instructions
        </label>
        <div
          onBlur={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) {
              return
            }
            const ta = e.currentTarget.querySelector('textarea')
            if (ta) saveField('instructions', ta.value)
          }}
        >
          <MarkdownEditor
            id={`step-${step.id}-instructions`}
            name={`step-${step.id}-instructions`}
            defaultValue={savedInstructions}
            maxLength={5000}
            placeholder="Optional instructions in markdown."
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Paints
          </span>
          <RecipeStepPaintPicker stepId={step.id} palette={palette} />
        </div>
        <RecipeStepPaintList
          stepId={step.id}
          paints={step.paints}
          canEdit={true}
        />
      </div>
    </div>
  )
}
