import type { Metadata } from 'next'

/**
 * Input for {@link pageMetadata}.
 *
 * @param title - Page-specific title. Will be combined with the root title
 *   template (`%s · Grimify`) for the document title.
 * @param description - Page-specific description used for `<meta name="description">`,
 *   OpenGraph, and Twitter cards.
 * @param path - Optional canonical path for the page (e.g. `/paints`). When set,
 *   produces `alternates.canonical` and `openGraph.url`.
 * @param noindex - When true, sets `robots: { index: false, follow: false }`.
 *   Use for private/admin/auth screens that should not appear in search results.
 * @param image - Optional override for the OG/Twitter image. Defaults to the
 *   site-wide `/og-image.png` inherited from the root layout.
 */
export type PageMetadataInput = {
  title: string
  description: string
  path?: string
  noindex?: boolean
  image?: { url: string; width?: number; height?: number; alt?: string }
}

/**
 * Builds a per-page {@link Metadata} object that mirrors the page's title and
 * description into OpenGraph and Twitter card fields, and optionally marks the
 * page as `noindex`.
 *
 * Page-level `metadata` exports shallow-merge with the root layout's defaults,
 * so unset fields (icons, manifest, themeColor) continue to inherit.
 *
 * @param input - See {@link PageMetadataInput}.
 * @returns A {@link Metadata} object suitable for `export const metadata` in a route segment.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, noindex, image } = input

  const og: NonNullable<Metadata['openGraph']> = {
    title,
    description,
  }
  if (path) og.url = path
  if (image) og.images = [image]

  const meta: Metadata = {
    title,
    description,
    openGraph: og,
    twitter: {
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  }

  if (path) meta.alternates = { canonical: path }
  if (noindex) meta.robots = { index: false, follow: false }

  return meta
}
