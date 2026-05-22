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
 * @param keywords - Optional page-specific keywords for `<meta name="keywords">`.
 * @param ogType - Optional OpenGraph type override. Defaults to `website` (inherited
 *   from root layout). Use `article` for recipe detail pages and `profile` for
 *   user profile pages.
 */
export type PageMetadataInput = {
  title: string
  description: string
  path?: string
  noindex?: boolean
  image?: { url: string; width?: number; height?: number; alt?: string }
  keywords?: string[]
  ogType?: 'website' | 'article' | 'profile'
}

/**
 * Builds a per-page {@link Metadata} object that mirrors the page's title and
 * description into OpenGraph and Twitter card fields, and optionally marks the
 * page as `noindex`.
 *
 * - Sets `twitter.card` to `summary_large_image` when an image is provided,
 *   `summary` otherwise — overriding the root layout default for imageless pages.
 * - Adds `googlebot` directives (`max-image-preview: large`, `max-snippet: -1`)
 *   for all indexed pages to maximise SERP snippet and image display.
 * - Page-level `metadata` exports shallow-merge with the root layout's defaults,
 *   so unset fields (icons, manifest, themeColor) continue to inherit.
 *
 * @param input - See {@link PageMetadataInput}.
 * @returns A {@link Metadata} object suitable for `export const metadata` in a route segment.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, noindex, image, keywords, ogType } = input

  const og: NonNullable<Metadata['openGraph']> = {
    title,
    description,
    ...(ogType ? { type: ogType } : {}),
  }
  if (path) og.url = path
  if (image) og.images = [image]

  const meta: Metadata = {
    title,
    description,
    openGraph: og,
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  }

  if (keywords?.length) meta.keywords = keywords
  if (path) meta.alternates = { canonical: path }

  if (noindex) {
    meta.robots = { index: false, follow: false }
  } else {
    meta.robots = {
      index: true,
      follow: true,
      googleBot: {
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    }
  }

  return meta
}
