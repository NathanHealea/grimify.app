import { Archive, BookOpen, Building2, Layers, Search } from 'lucide-react'

import type { Feature } from '@/modules/marketing/types/feature'

/** Static list of marketing features rendered on the homepage feature grid. */
export const features: Feature[] = [
  {
    slug: 'paints',
    title: 'Cross-Brand Search',
    blurb: 'Search every major brand by name, hex code, or color and find the closest match.',
    icon: Search,
    href: '/paints',
  },
  {
    slug: 'brands',
    title: 'Brand Browser',
    blurb: 'Explore full paint lines from your favourite manufacturers side by side.',
    icon: Building2,
    href: '/brands',
  },
  {
    slug: 'palettes',
    title: 'Palettes',
    blurb: 'Build project palettes from any source, reorder freely, and share with the community.',
    icon: Layers,
    href: '/palettes',
  },
  {
    slug: 'recipes',
    title: 'Painting Recipes',
    blurb: 'Document step-by-step painting guides with paints, techniques, and notes.',
    icon: BookOpen,
    href: '/recipes',
  },
  {
    slug: 'collection',
    title: 'Collection Tracking',
    blurb: 'Log the paints you own, plan your next purchase, and never buy a duplicate.',
    icon: Archive,
    href: '/collection',
  },
]
