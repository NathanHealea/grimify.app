import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { CtaSection } from '@/modules/marketing/components/cta-section'
import { FeatureGrid } from '@/modules/marketing/components/feature-grid'
import { Hero } from '@/modules/marketing/components/hero'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Color research for miniature painters',
  description:
    'Search paints across every major brand, build palettes, track your collection, and share recipes — Grimify is the painter\'s color companion.',
  path: '/',
})

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Main>
      <Hero />
      <FeatureGrid />
      <CtaSection isAuthenticated={!!user} />
    </Main>
  )
}
