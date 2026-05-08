'use client'

import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'

/**
 * Compact palette picker for the recipe form.
 *
 * Renders a native `<select>` populated with the caller's palette summaries
 * plus a "No palette" sentinel. Returning a typed combobox is intentional
 * overkill for v1 — user palettes are typically a handful of rows, and a
 * native select is keyboard-accessible and fully form-data-compatible
 * without extra plumbing.
 *
 * @param props.name - Form field name. The selected value is the palette UUID
 *   or `""` for "no palette".
 * @param props.palettes - Caller's palettes, used to populate the dropdown.
 * @param props.defaultValue - Initially-selected palette UUID, or `null` for none.
 * @param props.id - Optional DOM id for label association.
 */
export function RecipePaletteCombobox({
  name,
  palettes,
  defaultValue,
  id,
}: {
  name: string
  palettes: PaletteSummary[]
  defaultValue: string | null
  id?: string
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ''}
      className="select w-full"
    >
      <option value="">No palette</option>
      {palettes.map((palette) => (
        <option key={palette.id} value={palette.id}>
          {palette.name}
        </option>
      ))}
    </select>
  )
}
