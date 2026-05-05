import type { Lab } from './hex-to-lab'

/**
 * Computes the CIE76 ΔE between two CIE L*a*b* colors.
 *
 * CIE76 is the Euclidean distance in Lab space. Intentionally chosen over
 * CIEDE2000 — cheap, monotone enough for ranking, and sufficient for sorting
 * same-hue candidates by perceptual proximity.
 *
 * @param a - First Lab color.
 * @param b - Second Lab color.
 * @returns ΔE value (0 = identical; values below ~2 are imperceptible).
 */
export function deltaE76(a: Lab, b: Lab): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}
