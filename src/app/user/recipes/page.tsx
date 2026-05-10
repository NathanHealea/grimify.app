import { redirect } from 'next/navigation'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import { RecipeCardGrid } from '@/modules/recipes/components/recipe-card-grid'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'My recipes',
  description: 'Manage your saved Grimify painting recipes.',
  path: '/user/recipes',
  noindex: true,
})

export default async function UserRecipesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/user/recipes')

  const service = createRecipeService(supabase)
  const summaries = await service.listRecipesForUser(user.id)

  return (
    <Main>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">My recipes</h1>
        <form action="/user/recipes/new" method="post">
          <button type="submit" className="btn btn-primary btn-sm">
            New recipe
          </button>
        </form>
      </div>

      {summaries.length > 0 ? (
        <RecipeCardGrid summaries={summaries} canEditAll />
      ) : (
        <div className="card card-body items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            You don&apos;t have any recipes yet.
          </p>
          <form action="/user/recipes/new" method="post" className="mt-4">
            <button type="submit" className="btn btn-primary btn-sm">
              Create your first recipe
            </button>
          </form>
        </div>
      )}
    </Main>
  )
}
