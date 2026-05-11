import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { NotFoundContent } from '@/modules/marketing/components/not-found-content'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Page not found',
  description:
    'We couldn’t find that page on Grimify. Try one of the popular destinations below.',
  noindex: true,
})

export default async function NotFound() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Main>
      <NotFoundContent isAuthenticated={!!user} />
    </Main>
  )
}
