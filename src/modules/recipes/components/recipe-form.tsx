'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'
import type { Recipe } from '@/modules/recipes/types/recipe'
import type { RecipeFormState } from '@/modules/recipes/types/recipe-form-state'
import { updateRecipe } from '@/modules/recipes/actions/update-recipe'
import { RecipePaletteCombobox } from '@/modules/recipes/components/recipe-palette-combobox'
import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'

const initialState = (recipe: Recipe): RecipeFormState => ({
  values: {
    title: recipe.title,
    summary: recipe.summary ?? '',
    isPublic: recipe.isPublic,
    paletteId: recipe.paletteId,
  },
  errors: {},
})

/**
 * Editable form for a recipe's metadata: title, summary, visibility, palette pin.
 *
 * Renders only the `<form>` element — card chrome and surrounding layout belong
 * to the parent route page or `<RecipeBuilder>`. Wires the {@link updateRecipe}
 * action via React 19's `useActionState`. Field errors render inline; form-level
 * errors and the success state are surfaced through Sonner toasts.
 *
 * @param props.recipe - Recipe being edited; seeds initial form values.
 * @param props.palettes - Caller's palettes, populates the palette combobox.
 */
export function RecipeForm({
  recipe,
  palettes,
}: {
  recipe: Recipe
  palettes: PaletteSummary[]
}) {
  const [state, formAction, isPending] = useActionState(updateRecipe, initialState(recipe))

  useEffect(() => {
    if (state.errors.form) {
      toast.error(state.errors.form)
    } else if (state.success) {
      toast.success('Recipe saved')
    }
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={recipe.id} />

      <div className="form-item">
        <label htmlFor="recipe-title" className="form-label">
          Title
        </label>
        <input
          id="recipe-title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={state.values.title}
          className="input w-full"
          placeholder="My recipe"
        />
        {state.errors.title && (
          <p className="text-sm text-destructive">{state.errors.title}</p>
        )}
      </div>

      <div className="form-item">
        <label htmlFor="recipe-summary" className="form-label">
          Summary
        </label>
        <MarkdownEditor
          id="recipe-summary"
          name="summary"
          defaultValue={state.values.summary}
          maxLength={5000}
          placeholder="Optional summary — what this recipe achieves, the inspiration, the source."
          error={state.errors.summary}
        />
      </div>

      <div className="form-item">
        <label htmlFor="recipe-palette" className="form-label">
          Pinned palette
        </label>
        <RecipePaletteCombobox
          id="recipe-palette"
          name="paletteId"
          palettes={palettes}
          defaultValue={state.values.paletteId}
        />
      </div>

      <div className="form-item flex-row items-center gap-3">
        <input
          id="recipe-is-public"
          name="isPublic"
          type="checkbox"
          value="true"
          defaultChecked={state.values.isPublic}
          className="checkbox"
        />
        <label htmlFor="recipe-is-public" className="form-label mb-0">
          Make public
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
