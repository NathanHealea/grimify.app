/**
 * Empty-state block shown when a palette has no paint slots.
 *
 * @param variant - `"owner"` shows actionable copy; `"guest"` shows a neutral message.
 */
export function PaletteEmptyState({ variant }: { variant: 'owner' | 'guest' }) {
  return (
    <div className="card card-body items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">
        {variant === 'owner'
          ? 'No paints yet — add some from any paint card or the scheme explorer.'
          : 'This palette is empty.'}
      </p>
    </div>
  )
}
