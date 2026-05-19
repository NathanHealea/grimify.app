'use client'

import { Button } from '@/components/ui/button'

/**
 * Two-tab toggle that switches the picker between palette and library modes.
 *
 * Rendered only by {@link RecipeStepPaintPicker} when the recipe has a
 * linked palette — the tabs are pointless when there's nothing to pick from
 * besides the full library, and the picker collapses to library-only in
 * that case. Switching tabs swaps the picker body in place; it does not
 * close the dialog.
 *
 * @param props.value - Current mode: `'palette'` or `'library'`.
 * @param props.onChange - Called with the next mode when a tab is clicked.
 */
export function RecipeStepPaintModeTabs({
  value,
  onChange,
}: {
  value: 'palette' | 'library'
  onChange: (next: 'palette' | 'library') => void
}) {
  return (
    <div role="tablist" aria-label="Paint source" className="flex gap-1">
      <Button
        type="button"
        role="tab"
        aria-selected={value === 'palette'}
        onClick={() => onChange('palette')}
        className={`btn-sm ${value === 'palette' ? 'btn-primary' : 'btn-ghost'}`}
      >
        Palette
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={value === 'library'}
        onClick={() => onChange('library')}
        className={`btn-sm ${value === 'library' ? 'btn-primary' : 'btn-ghost'}`}
      >
        All paints
      </Button>
    </div>
  )
}
