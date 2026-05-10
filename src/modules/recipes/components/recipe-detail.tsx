import Link from 'next/link'

import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'
import { RecipeNoteDisplay } from '@/modules/recipes/components/recipe-note-display'
import { RecipePhotoGrid } from '@/modules/recipes/components/recipe-photo-grid'
import { RecipeStepPaintList } from '@/modules/recipes/components/recipe-step-paint-list'
import type { Recipe } from '@/modules/recipes/types/recipe'

/**
 * Read-only render of a fully hydrated {@link Recipe}.
 *
 * Lays out the recipe top-to-bottom: title header (with an optional "Edit"
 * link for the owner), summary (markdown), recipe-level notes via
 * {@link RecipeNoteDisplay}, then each section as a heading followed by its
 * numbered steps. Each step shows its title, a technique chip, the
 * instructions block (markdown), step-level notes (compact), and the
 * read-only paint list.
 *
 * Step paints render via the shared {@link RecipeStepPaintList} in read mode
 * (`canEdit={false}`) so the builder and the detail view always agree on
 * shape and ordering. The list is itself a client component, but the rest
 * of `RecipeDetail` stays a server component.
 *
 * @param props.recipe - Fully hydrated recipe to render.
 * @param props.canEdit - When true, renders the "Edit" link to the builder.
 */
export function RecipeDetail({
  recipe,
  canEdit,
}: {
  recipe: Recipe
  canEdit: boolean
}) {
  return (
    <article className="card card-body flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{recipe.title}</h1>
            <p className="text-xs text-muted-foreground">
              {recipe.isPublic ? 'Public recipe' : 'Private recipe'}
            </p>
          </div>
          {canEdit && (
            <Link
              href={`/user/recipes/${recipe.id}/edit`}
              className="btn btn-sm btn-outline"
            >
              Edit
            </Link>
          )}
        </div>
        {recipe.summary && (
          <MarkdownRenderer
            content={recipe.summary}
            className="text-sm leading-relaxed"
          />
        )}
      </header>

      <RecipeNoteDisplay notes={recipe.notes} />

      {recipe.photos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Photos</h2>
          <RecipePhotoGrid
            parent={{ kind: 'recipe', recipeId: recipe.id }}
            recipeId={recipe.id}
            photos={recipe.photos}
            canEdit={false}
          />
        </section>
      )}

      {recipe.sections.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          This recipe has no sections yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {recipe.sections.map((section, sectionIndex) => (
            <section key={section.id} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                <span className="tabular-nums text-muted-foreground">
                  {sectionIndex + 1}.
                </span>{' '}
                {section.title}
              </h2>

              {section.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps yet.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {section.steps.map((step, stepIndex) => {
                    const label = `${sectionIndex + 1}.${stepIndex + 1}`
                    return (
                      <li
                        key={step.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-3"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-medium tabular-nums text-muted-foreground">
                            {label}
                          </span>
                          {step.title && (
                            <span className="text-sm font-medium">
                              {step.title}
                            </span>
                          )}
                          {step.technique && (
                            <span className="badge badge-secondary badge-sm">
                              {step.technique}
                            </span>
                          )}
                        </div>

                        {step.instructions && (
                          <MarkdownRenderer
                            content={step.instructions}
                            className="text-sm leading-relaxed"
                          />
                        )}

                        <RecipeNoteDisplay notes={step.notes} compact />

                        {step.paints.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground">
                            No paints recorded for this step.
                          </p>
                        ) : (
                          <RecipeStepPaintList
                            stepId={step.id}
                            paints={step.paints}
                            canEdit={false}
                          />
                        )}

                        {step.photos.length > 0 && (
                          <RecipePhotoGrid
                            parent={{ kind: 'step', stepId: step.id }}
                            recipeId={recipe.id}
                            photos={step.photos}
                            canEdit={false}
                            compact
                          />
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </article>
  )
}
