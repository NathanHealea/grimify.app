import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/sign-in?next=/user/recipes', request.url), 303)
  }

  const service = createRecipeService(supabase)
  const recipe = await service.createRecipe({ userId: user.id, title: 'Untitled recipe' })

  revalidatePath('/user/recipes')
  revalidatePath('/recipes')

  return NextResponse.redirect(new URL(`/user/recipes/${recipe.id}/edit`, request.url), 303)
}
