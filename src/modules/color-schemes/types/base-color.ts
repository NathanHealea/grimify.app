/**
 * A selected base color for scheme generation, sourced from a paint or a custom hex input.
 *
 * @remarks
 * `name` is present when the color was selected from the paint database; absent for custom hex inputs.
 * `saturation` and `lightness` are stored as percentages (0–100), not fractions.
 */
export type BaseColor = {
  hue: number        // 0–360
  saturation: number // 0–100
  lightness: number  // 0–100
  hex: string        // '#RRGGBB'
  name?: string
}
