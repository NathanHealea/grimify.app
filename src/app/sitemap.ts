import type { MetadataRoute } from 'next'

import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/modules/seo/utils/site-url'

/**
 * Generates the public sitemap covering static routes plus every public
 * paint, brand, hue, palette, and profile.
 *
 * Queries run through the cookie-aware (anon) Supabase client, so RLS
 * automatically filters non-public palettes and any soft-deleted rows.
 * The palette query also adds an explicit `is_public = true` filter as a
 * defense-in-depth guard.
 *
 * @returns A {@link MetadataRoute.Sitemap} entry list. URLs are absolute,
 *   built from {@link siteUrl}.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/paints`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/palettes`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/schemes`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const supabase = await createClient()

  const [paints, brands, hues, palettes, profiles] = await Promise.all([
    supabase.from('paints').select('id, updated_at'),
    supabase.from('brands').select('id, created_at'),
    supabase.from('hues').select('id, created_at'),
    supabase.from('palettes').select('id, updated_at').eq('is_public', true),
    supabase.from('profiles').select('id, updated_at, display_name').not('display_name', 'is', null),
  ])

  const paintEntries: MetadataRoute.Sitemap = (paints.data ?? []).map((p) => ({
    url: `${base}/paints/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const brandEntries: MetadataRoute.Sitemap = (brands.data ?? []).map((b) => ({
    url: `${base}/brands/${b.id}`,
    lastModified: b.created_at ? new Date(b.created_at) : now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const hueEntries: MetadataRoute.Sitemap = (hues.data ?? []).map((h) => ({
    url: `${base}/hues/${h.id}`,
    lastModified: h.created_at ? new Date(h.created_at) : now,
    changeFrequency: 'yearly',
    priority: 0.4,
  }))

  const paletteEntries: MetadataRoute.Sitemap = (palettes.data ?? []).map((p) => ({
    url: `${base}/palettes/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const profileEntries: MetadataRoute.Sitemap = (profiles.data ?? []).map((p) => ({
    url: `${base}/users/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.3,
  }))

  return [
    ...staticRoutes,
    ...paintEntries,
    ...brandEntries,
    ...hueEntries,
    ...paletteEntries,
    ...profileEntries,
  ]
}
