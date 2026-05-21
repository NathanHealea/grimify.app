import { Archive, BookOpen, Building2, Layers, Search } from 'lucide-react'

import type { Feature } from '@/modules/marketing/types/feature'

/** Static list of marketing features rendered on the homepage feature grid. */
export const features: Feature[] = [
  {
    slug: 'paints',
    title: 'Cross-Brand Search',
    blurb: 'Search Citadel, Vallejo, Army Painter, and 10+ other brands by name, hex, or colour. Find the closest match in seconds.',
    icon: Search,
    href: '/paints',
  },
  {
    slug: 'brands',
    title: 'Brand Browser',
    blurb: 'Browse every Citadel, Vallejo, and Scale75 range — full product lines, side by side.',
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
    blurb: 'Log every pot on your shelf, track what you\'re missing, and stop buying duplicates.',
    icon: Archive,
    href: '/collection',
  },
]
