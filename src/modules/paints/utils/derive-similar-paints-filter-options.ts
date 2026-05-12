import type { Brand } from '@/types/paint'

/**
 * Normalised option lists for the Similar Paints filter UI.
 *
 * Both arrays are stable references for a given input (memo-friendly) and
 * sorted alphabetically. Paint types are trimmed and deduped defensively in
 * case the caller hands in raw catalog values.
 *
 * @property brands - Brands sorted by name ascending.
 * @property paintTypes - Distinct, trimmed paint-type strings sorted
 *   alphabetically. Excludes `null` (callers should add the `'Untyped'`
 *   sentinel to the UI manually when a "no type" option is desired).
 */
export type SimilarPaintsFilterOptions = {
  brands: Brand[]
  paintTypes: string[]
}

/**
 * Builds the option lists for the Similar Paints filter dropdowns.
 *
 * Sorts brands by name and paint types alphabetically; trims and dedupes
 * defensively so accidental whitespace differences in the catalog don't
 * produce duplicate options.
 *
 * @param brands - Brands available in the catalog (typically the result of
 *   {@link getAllBrands}).
 * @param paintTypes - Raw paint-type strings from the catalog. May include
 *   duplicates, mixed casing, or surrounding whitespace.
 * @returns Sorted, deduped {@link SimilarPaintsFilterOptions}.
 */
export function deriveSimilarPaintsFilterOptions(
  brands: Brand[],
  paintTypes: ReadonlyArray<string | null | undefined>,
): SimilarPaintsFilterOptions {
  const sortedBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name))

  const seen = new Set<string>()
  const cleanedTypes: string[] = []
  for (const raw of paintTypes) {
    if (raw == null) continue
    const trimmed = raw.trim()
    if (trimmed.length === 0) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    cleanedTypes.push(trimmed)
  }
  cleanedTypes.sort((a, b) => a.localeCompare(b))

  return { brands: sortedBrands, paintTypes: cleanedTypes }
}
