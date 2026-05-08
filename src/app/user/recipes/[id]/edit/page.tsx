import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { RecipeBuilder } from '@/modules/recipes/components/recipe-builder'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Edit recipe',
  description: 'Edit your painting recipe on Grimify.',
  noindex: true,
})

export default async function UserRecipeEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/sign-in?next=/user/recipes/${id}/edit`)

  const recipeService = createRecipeService(supabase)
  const recipe = await recipeService.getRecipeById(id)

  if (!recipe || recipe.userId !== user.id) notFound()

  const paletteService = createPaletteService(supabase)
  const palettes = await paletteService.listPalettesForUser(user.id)

  return (
    <Main>
      <Link
        href={`/recipes/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to recipe
      </Link>
      <h1 className="mb-8 text-3xl font-bold">Edit recipe</h1>
      <RecipeBuilder recipe={recipe} palettes={palettes} />
    </Main>
  )
}
