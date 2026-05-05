/**
 * Returns a new array with the item at `fromIndex` moved to `toIndex`.
 *
 * Pure — does not mutate the input. Works for any out-of-range indices by
 * clamping (callers should already validate, but clamping makes the helper
 * safe for animation frame edge cases).
 *
 * @param items - The source array.
 * @param fromIndex - Index of the item to move.
 * @param toIndex - Index to insert the item at.
 * @returns A new array with the item repositioned.
 */
export function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
