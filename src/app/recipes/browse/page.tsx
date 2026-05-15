import { getRecipeService } from '@/modules/recipes/services/recipe-service.server'
import { RecipeBrowsePage } from '@/modules/recipes/components/recipe-browse-page'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Browse Recipes',
  description: 'Discover step-by-step painting recipes from the Grimify community.',
  path: '/recipes/browse',
})

/** Valid page sizes accepted via the `?size=` search param. */
const VALID_SIZES = [12, 24, 48]
/** Default number of recipe cards shown per page. */
const DEFAULT_SIZE = 24

export default async function RecipesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const { page, size } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : DEFAULT_SIZE
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const service = await getRecipeService()
  const [summaries, totalCount] = await Promise.all([
    service.listPublicRecipes({ limit: pageSize, offset }),
    service.countPublicRecipes(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  return (
    <RecipeBrowsePage
      summaries={summaries}
      totalCount={totalCount}
      currentPage={safePage}
      pageSize={pageSize}
    />
  )
}
