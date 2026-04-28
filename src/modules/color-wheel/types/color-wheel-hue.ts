/**
 * Hue data for color wheel sector rendering.
 *
 * Top-level Munsell hues carry a populated {@link ColorWheelHue.children} array
 * of their ISCC-NBS sub-hues. Child hues have an empty children array.
 */
export type ColorWheelHue = {
  id: string
  name: string
  hex_code: string
  sort_order: number | null
  children: ColorWheelHue[]
}
