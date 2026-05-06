/**
 * Entities that have a dynamic OG image route under `/api/og/<entity>/[id]`.
 */
export type OgEntity = 'paint' | 'palette' | 'brand' | 'hue' | 'user'

/**
 * Builds the relative URL for an entity's dynamic OG image route.
 *
 * The root layout's `metadataBase` resolves this to an absolute URL when
 * Next.js renders the meta tags, so social platforms can fetch the image.
 *
 * @param entity - The entity kind (see {@link OgEntity}).
 * @param id - The entity's identifier (string UUID or numeric brand id).
 * @returns A relative URL like `/api/og/paint/abc-123`.
 */
export function buildOgUrl(entity: OgEntity, id: string | number): string {
  return `/api/og/${entity}/${id}`
}
