import type { MetadataRoute } from 'next'

import { siteUrl } from '@/modules/seo/utils/site-url'

/**
 * Generates the site's `/robots.txt` policy.
 *
 * In production (`NEXT_PUBLIC_ENV === 'production'`) crawlers may index public
 * routes but are blocked from `/admin` and `/api/`. In every other environment
 * (preview, staging, local) all crawling is disallowed so non-prod URLs never
 * leak into search indexes.
 *
 * @returns A {@link MetadataRoute.Robots} object consumed by Next.js's
 *   built-in robots route convention.
 */
export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NEXT_PUBLIC_ENV === 'production'
  return {
    rules: isProd
      ? { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
