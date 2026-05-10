/**
 * Empty-state block shown when a recipe list has no entries.
 *
 * @param variant - `"owner"` nudges the viewer to create their first recipe;
 *   `"guest"` shows a neutral message for the public catalog.
 */
export function RecipeEmptyState({ variant }: { variant: 'owner' | 'guest' }) {
  return (
    <div className="card card-body items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">
        {variant === 'owner'
          ? 'No recipes yet — start a new one to outline your painting steps.'
          : 'No public recipes yet.'}
      </p>
    </div>
  )
}
