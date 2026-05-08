import Link from 'next/link'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { PaletteCardGrid } from '@/modules/palettes/components/palette-card-grid'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

const PAGE_SIZE = 24

export const metadata = pageMetadata({
  title: 'Community palettes',
  description: 'Browse paint palettes shared by the Grimify community.',
  path: '/palettes',
})

export default async function PalettesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page = '1' } = await searchParams
  const pageNum = Math.max(1, Number(page) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createPaletteService(supabase)
  const [summaries, total] = await Promise.all([
    service.listPublicPalettes({ limit: PAGE_SIZE, offset }),
    service.countPublicPalettes(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrev = pageNum > 1
  const hasNext = pageNum < totalPages

  return (
    <Main>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Community palettes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse paint palettes shared by the Grimify community.
          </p>
        </div>
        {user ? (
          <Link href="/user/palettes" className="btn btn-primary btn-sm">
            My palettes →
          </Link>
        ) : (
          <Link href="/sign-in?next=/user/palettes" className="btn btn-primary btn-sm">
            Sign in → Build a palette
          </Link>
        )}
      </div>

      {summaries.length > 0 ? (
        <>
          <PaletteCardGrid summaries={summaries} />
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between gap-4"
            >
              <Link
                href={`/palettes?page=${pageNum - 1}`}
                aria-disabled={!hasPrev}
                className={`btn btn-sm btn-ghost ${!hasPrev ? 'pointer-events-none opacity-50' : ''}`}
              >
                ← Previous
              </Link>
              <span className="text-sm text-muted-foreground">
                Page {pageNum} of {totalPages}
              </span>
              <Link
                href={`/palettes?page=${pageNum + 1}`}
                aria-disabled={!hasNext}
                className={`btn btn-sm btn-ghost ${!hasNext ? 'pointer-events-none opacity-50' : ''}`}
              >
                Next →
              </Link>
            </nav>
          )}
        </>
      ) : (
        <div className="card card-body items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            No public palettes yet — sign in and share the first one.
          </p>
          <Link
            href={user ? '/user/palettes' : '/sign-in?next=/user/palettes'}
            className="btn btn-primary btn-sm mt-4"
          >
            {user ? 'Go to My palettes' : 'Sign in'}
          </Link>
        </div>
      )}
    </Main>
  )
}
