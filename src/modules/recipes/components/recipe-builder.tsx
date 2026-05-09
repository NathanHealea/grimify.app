'use client'

import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { DeleteRecipeButton } from '@/modules/recipes/components/delete-recipe-button'
import { RecipeForm } from '@/modules/recipes/components/recipe-form'
import { RecipePhotoGrid } from '@/modules/recipes/components/recipe-photo-grid'
import { RecipeSectionList } from '@/modules/recipes/components/recipe-section-list'
import type { Recipe } from '@/modules/recipes/types/recipe'

/**
 * Full recipe editor — composes the metadata form, sections + steps lists, and
 * the delete action.
 *
 * Mirrors `PaletteBuilder`: a single card containing the {@link RecipeForm} for
 * title/summary/visibility/palette pin, then the sortable
 * {@link RecipeSectionList}, and a footer with {@link DeleteRecipeButton}.
 *
 * @param props.recipe - Fully hydrated recipe to edit.
 * @param props.palettes - Caller's palettes for the palette pin combobox.
 */
export function RecipeBuilder({
  recipe,
  palettes,
}: {
  recipe: Recipe
  palettes: PaletteSummary[]
}) {
  return (
    <div className="card card-body flex flex-col gap-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Details</h2>
        <RecipeForm recipe={recipe} palettes={palettes} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Sections &amp; steps</h2>
        <RecipeSectionList
          recipeId={recipe.id}
          sections={recipe.sections}
          palette={recipe.palette}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Photos</h2>
        <RecipePhotoGrid
          parent={{ kind: 'recipe', recipeId: recipe.id }}
          recipeId={recipe.id}
          photos={recipe.photos}
          canEdit
          coverPhotoId={recipe.coverPhotoId}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <DeleteRecipeButton recipe={recipe} />
      </div>
    </div>
  )
}
