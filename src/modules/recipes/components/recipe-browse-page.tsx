import { Main } from '@/components/main'
import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'
import { RecipeCardGrid } from '@/modules/recipes/components/recipe-card-grid'
import { RecipeBrowsePagination } from '@/modules/recipes/components/recipe-browse-pagination'
import type { RecipeSummary } from '@/modules/recipes/types/recipe-summary'

/**
 * Layout for the public recipe browse page.
 *
 * Renders a page header, a responsive grid of {@link RecipeCard} tiles, and
 * URL-driven pagination controls. Receives all data as props — data fetching
 * is handled by the route page (`/recipes/browse/page.tsx`).
 *
 * @param props.summaries - Public recipe rows for the current page.
 * @param props.totalCount - Total number of public recipes (all pages).
 * @param props.currentPage - Active 1-based page number.
 * @param props.pageSize - Number of cards per page.
 */
export function RecipeBrowsePage({
  summaries,
  totalCount,
  currentPage,
  pageSize,
}: {
  summaries: RecipeSummary[]
  totalCount: number
  currentPage: number
  pageSize: number
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <Main>
      <PageHeader>
        <PageTitle>Recipes</PageTitle>
        <PageSubtitle>Browse {totalCount.toLocaleString()} public recipes.</PageSubtitle>
      </PageHeader>

      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public recipes yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          <RecipeCardGrid summaries={summaries} />
          <RecipeBrowsePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalCount}
            basePath="/recipes/browse"
          />
        </div>
      )}
    </Main>
  )
}
