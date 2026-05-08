/**
 * Re-numbers a list of position-bearing rows to a contiguous `0..N-1` range.
 *
 * Sorts by the current `position` value, then reassigns positions sequentially
 * starting from 0. Returns a new array — the input is not mutated.
 *
 * Call this before any mutation that adds, removes, or reorders sections,
 * steps, step-paints, notes, or photos. Each child table has a unique
 * constraint on `(parent_id, position)`, so gaps left after a delete must be
 * closed before writing.
 *
 * @param rows - The current child rows.
 * @returns A new array with positions renumbered `0..N-1`.
 */
export function normalizeRecipePositions<T extends { position: number }>(rows: T[]): T[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row, index) => ({ ...row, position: index }))
}
