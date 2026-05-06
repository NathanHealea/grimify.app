import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Color research for miniature painters',
  description:
    'Search paints across brands, compare colors, build palettes, and share recipes — Grimify is the painter\'s color companion.',
  path: '/',
})

export default function Home() {
  return <main className="flex min-h-0 flex-1 items-center justify-center"></main>
}
