import { BookOpen, Layers, Palette, Search } from 'lucide-react'

import type { Feature } from '@/modules/marketing/types/feature'

/**
 * Static list of marketing features rendered on the homepage feature grid.
 *
 * @remarks Single source of truth — adding, removing, or reordering features
 *   is a one-file change. The `recipes` route is not yet shipped; the card
 *   will resolve to a 404 until that route lands.
 */
export const features: Feature[] = [
  {
    slug: 'paints',
    title: 'Cross-Brand Search',
    blurb: 'Search every supported paint range and find the closest match across brands.',
    icon: Search,
    href: '/paints',
  },
  {
    slug: 'schemes',
    title: 'Color Schemes',
    blurb: 'Build complementary, split, and analogous schemes from any starting paint.',
    icon: Palette,
    href: '/schemes',
  },
  {
    slug: 'palettes',
    title: 'Palettes & Collection',
    blurb:
      'Save palettes for projects, track what\'s on your shelf, and share with the community.',
    icon: Layers,
    href: '/palettes',
  },
  {
    slug: 'recipes',
    title: 'Recipes',
    blurb:
      'Document and share step-by-step painting recipes with paints, layers, and notes.',
    icon: BookOpen,
    href: '/recipes',
  },
]
