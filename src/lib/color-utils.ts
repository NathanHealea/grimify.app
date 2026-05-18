/**
 * Converts a hex color string to RGB components.
 *
 * Accepts hex strings with or without a leading `#`. Only 6-digit hex
 * codes are supported.
 *
 * @param hex - A hex color string (e.g. `"#ff0000"` or `"ff0000"`).
 * @returns An `{ r, g, b }` object, or `null` if the input is invalid.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return { r, g, b }
}

/**
 * Converts RGB values to HSL.
 *
 * @param r - Red channel value (0–255).
 * @param g - Green channel value (0–255).
 * @param b - Blue channel value (0–255).
 * @returns `{ h, s, l }` where `h` is 0–360 degrees, `s` and `l` are 0–100 percentages.
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * Converts a hex color string directly to HSL values.
 *
 * Combines {@link hexToRgb} and {@link rgbToHsl} for convenience.
 *
 * @param hex - A hex color string (e.g. `"#ff0000"` or `"ff0000"`).
 * @returns `{ h, s, l }` or `null` if the hex string is invalid.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsl(rgb.r, rgb.g, rgb.b)
}
