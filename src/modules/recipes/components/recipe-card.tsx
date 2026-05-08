import Link from 'next/link'

import type { RecipeSummary } from '@/modules/recipes/types/recipe-summary'
import { formatRecipeUpdatedLabel } from '@/modules/recipes/utils/format-recipe-updated-label'

/**
 * Dashboard tile for a single recipe.
 *
 * Uses a stretched-link pattern: an invisible `absolute inset-0` anchor makes
 * the whole card tappable, while the "Edit" link sits above it via `z-index`.
 * This avoids nested `<a>` elements and event-handler props, keeping the
 * component a pure server component.
 *
 * Renders the cover photo when {@link RecipeSummary.coverPhotoUrl} is set;
 * otherwise falls back to a muted placeholder block so the card has a
 * consistent height across rows.
 *
 * @param props.summary - Lightweight recipe data from {@link RecipeSummary}.
 * @param props.canEdit - When true, shows an "Edit" link in the card corner.
 */
export function RecipeCard({
  summary,
  canEdit,
}: {
  summary: RecipeSummary
  canEdit?: boolean
}) {
  return (
    <div className="relative">
      <div className="card card-body card-compact flex flex-col gap-3">
        {summary.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={summary.coverPhotoUrl}
            alt=""
            className="aspect-video w-full rounded-md object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="aspect-video w-full rounded-md bg-muted"
          />
        )}
        <div>
          <h3 className="card-title text-base">{summary.title}</h3>
          {summary.ownerDisplayName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              by {summary.ownerDisplayName}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {summary.stepCount} {summary.stepCount === 1 ? 'step' : 'steps'}
            </span>
            {summary.isPublic ? (
              <span className="badge badge-soft badge-sm">Public</span>
            ) : (
              <span className="badge badge-soft badge-sm">Private</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRecipeUpdatedLabel(summary.updatedAt)}
            </span>
          </div>
        </div>
      </div>
      {/* Stretched link makes the whole card tappable without nesting <a> tags */}
      <Link
        href={`/recipes/${summary.id}`}
        className="absolute inset-0 z-0"
        aria-label={summary.title}
      />
      {canEdit && (
        <Link
          href={`/user/recipes/${summary.id}/edit`}
          className="btn btn-ghost btn-xs absolute right-2 top-2 z-10"
        >
          Edit
        </Link>
      )}
    </div>
  )
}
