import { deltaE76 } from '@/modules/color-wheel/utils/delta-e76'
import { hexToLab } from '@/modules/color-wheel/utils/hex-to-lab'

/**
 * Pure mapping of `paintId -> paintId -> ΔE`.
 *
 * Diagonal entries are `0`. The matrix is symmetric (`result[a][b] === result[b][a]`).
 */
export type PairwiseDeltaE = Record<string, Record<string, number>>

/**
 * Computes the CIE76 ΔE between every ordered pair of paints in a list.
 *
 * Converts each paint's hex to Lab once, then fills the upper triangle of the
 * NxN matrix and mirrors it. Symmetric output: callers can look up either
 * direction. Pure and memoisable by reference identity of the input array.
 *
 * @param paints - Paints to compare. Only `id` and `hex` are read.
 * @returns A symmetric {@link PairwiseDeltaE} keyed by paint ID.
 */
export function computePairwiseDeltaE(
  paints: ReadonlyArray<{ id: string; hex: string }>,
): PairwiseDeltaE {
  const labs = paints.map((p) => ({ id: p.id, lab: hexToLab(p.hex) }))

  const result: PairwiseDeltaE = {}
  for (const { id } of labs) {
    result[id] = {}
  }

  for (let i = 0; i < labs.length; i += 1) {
    const a = labs[i]
    result[a.id][a.id] = 0
    for (let j = i + 1; j < labs.length; j += 1) {
      const b = labs[j]
      const d = deltaE76(a.lab, b.lab)
      result[a.id][b.id] = d
      result[b.id][a.id] = d
    }
  }

  return result
}
