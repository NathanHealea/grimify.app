import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import { RecipeDetail } from '@/modules/recipes/components/recipe-detail'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createRecipeService(supabase)
  const recipe = await service.getRecipeById(id)

  if (!recipe) {
    return pageMetadata({
      title: 'Recipe not found',
      description: 'This recipe could not be found.',
      noindex: true,
    })
  }

  const isViewerOwner = recipe.userId === user?.id
  if (!recipe.isPublic && !isViewerOwner) {
    return pageMetadata({
      title: 'Recipe not found',
      description: 'This recipe could not be found.',
      noindex: true,
    })
  }

  return pageMetadata({
    title: recipe.title,
    description: recipe.summary?.slice(0, 200) ?? `${recipe.title} — a painting recipe on Grimify.`,
    path: `/recipes/${id}`,
    noindex: !recipe.isPublic,
  })
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createRecipeService(supabase)
  const recipe = await service.getRecipeById(id)

  if (!recipe) notFound()
  if (!recipe.isPublic && recipe.userId !== user?.id) notFound()

  const canEdit = recipe.userId === user?.id

  return (
    <Main>
      <RecipeDetail recipe={recipe} canEdit={canEdit} />
    </Main>
  )
}
