import type { HueService } from '@/modules/hues/services/hue-service'

/**
 * Returns the principal (top-level) hue id for any hue id in the hierarchy.
 *
 * If `hueId` already belongs to a principal hue (`parent_id IS NULL`), it is
 * returned as-is. If it references an ISCC-NBS sub-hue, the `parent_id` is
 * returned. Returns `null` if the hue cannot be found.
 *
 * @param hueService - The hue service instance.
 * @param hueId - The id of any hue (principal or sub-hue).
 * @returns The principal hue id, or `null` if the hue is missing.
 */
export async function resolvePrincipalHueId(
  hueService: HueService,
  hueId: string,
): Promise<string | null> {
  const hue = await hueService.getHueById(hueId)
  if (!hue) return null
  return hue.parent_id ?? hue.id
}
