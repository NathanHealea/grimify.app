/**
 * Tags whether a step paint was added from the recipe's linked palette or
 * picked from the full library.
 *
 * Returns `'palette'` when `paletteSlotId` is set, otherwise `'library'`.
 * Consumers (chip rendering, source filters) depend on this single
 * derivation so the rule stays consistent across the builder, the read
 * view, and any future bulk-import flows.
 */
export type StepPaintSource = 'palette' | 'library'

/**
 * Returns the {@link StepPaintSource} for a step paint based on whether
 * it carries a `paletteSlotId`.
 *
 * @param paletteSlotId - The optional palette-slot reference recorded
 *   alongside the step paint when picked from the recipe's linked palette.
 * @returns `'palette'` when set, `'library'` otherwise.
 */
export function formatStepPaintSource(
  paletteSlotId: string | null | undefined,
): StepPaintSource {
  return paletteSlotId ? 'palette' : 'library'
}
