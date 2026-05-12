import { serializeCompareParam } from '@/modules/paints/utils/parse-compare-params'

/**
 * Builds a `/compare` URL for a list of paint IDs.
 *
 * Caps the list at the comparison maximum via {@link serializeCompareParam}.
 * Returns `/compare` (with no query string) when `paintIds` is empty.
 *
 * @param paintIds - Ordered paint IDs to seed the comparison with.
 * @returns A relative URL like `'/compare?paints=id1,id2,id3'`.
 */
export function buildCompareUrl(paintIds: string[]): string {
  const csv = serializeCompareParam(paintIds)
  return csv ? `/compare?paints=${csv}` : '/compare'
}
