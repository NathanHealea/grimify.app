/** Hard cap on the number of paints that can be compared simultaneously. */
export const MAX_COMPARE_PAINTS = 6

/**
 * Parses the `?paints=` CSV query value into an ordered list of paint IDs.
 *
 * Trims whitespace, drops empty entries, deduplicates while preserving order,
 * and caps the result at {@link MAX_COMPARE_PAINTS}. Returns `[]` when the
 * input is falsy or contains no usable entries.
 *
 * @param raw - Raw value of the `paints` query parameter.
 * @returns Ordered, deduplicated list of paint IDs.
 */
export function parseCompareParam(raw: string | undefined | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of raw.split(',')) {
    const id = token.trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length === MAX_COMPARE_PAINTS) break
  }
  return out
}

/**
 * Serialises an ordered list of paint IDs into the `?paints=` CSV value.
 *
 * Caps at {@link MAX_COMPARE_PAINTS} and joins with commas. Empty input
 * yields an empty string.
 *
 * @param ids - Ordered paint IDs to serialise.
 * @returns The CSV string suitable for `URLSearchParams`.
 */
export function serializeCompareParam(ids: string[]): string {
  return ids.slice(0, MAX_COMPARE_PAINTS).join(',')
}
