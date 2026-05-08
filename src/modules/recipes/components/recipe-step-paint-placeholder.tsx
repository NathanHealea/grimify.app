'use client'

/**
 * Placeholder mount point for the per-step paint picker.
 *
 * The real picker ships in `02-recipe-step-paints.md`. Until then this stub
 * keeps the builder layout complete and signals to the user where step paint
 * editing will live.
 */
export function RecipeStepPaintPlaceholder() {
  return (
    <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      Paints — add per-step paints in the step paints feature.
    </div>
  )
}
