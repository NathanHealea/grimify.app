import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Legacy edit URL — owner-aware redirect.
 *
 * Owners are forwarded to the new `/user/recipes/[id]/edit` location;
 * everyone else is sent to the read-only public detail page. Kept for
 * bookmark continuity; safe to delete once analytics show no inbound traffic.
 */
export default async function RecipeEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const service = createRecipeService(supabase)
    const recipe = await service.getRecipeById(id)
    if (recipe && recipe.userId === user.id) {
      redirect(`/user/recipes/${id}/edit`)
    }
  }

  redirect(`/recipes/${id}`)
}
