import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { CtaSection } from '@/modules/marketing/components/cta-section'
import { FeatureGrid } from '@/modules/marketing/components/feature-grid'
import { Hero } from '@/modules/marketing/components/hero'
import { StatsStrip } from '@/modules/marketing/components/stats-strip'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Find any miniature paint — Citadel, Vallejo, Army Painter and more',
  description:
    'Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands in one place. Build palettes, track your collection, and share painting recipes — free to browse, no account needed.',
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
      <StatsStrip />
      <CtaSection isAuthenticated={!!user} />
    </Main>
  )
}
